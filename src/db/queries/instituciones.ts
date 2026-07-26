import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  institucionesTiposCaso,
  instituciones,
  sedesInstitucion,
  tiposCaso,
  tipoInstitucionEnum,
} from '../schema';

const RADIO_TIERRA_KM = 6371;

export type TipoInstitucion = (typeof tipoInstitucionEnum.enumValues)[number];

export type FiltrosInstituciones = {
  tipo?: TipoInstitucion;
  tipoCasoId?: string;
};

export async function listarInstituciones(filtros: FiltrosInstituciones = {}) {
  const condiciones = [eq(instituciones.estaActivo, true)];

  if (filtros.tipo) {
    condiciones.push(eq(instituciones.tipo, filtros.tipo));
  }

  if (filtros.tipoCasoId) {
    const filas = await db
      .select({ institucion: instituciones })
      .from(instituciones)
      .innerJoin(institucionesTiposCaso, eq(institucionesTiposCaso.institucionId, instituciones.id))
      .where(and(...condiciones, eq(institucionesTiposCaso.tipoCasoId, filtros.tipoCasoId)));

    return filas.map((fila) => fila.institucion);
  }

  return db
    .select()
    .from(instituciones)
    .where(and(...condiciones));
}

export async function listarInstitucionesCercanas(
  lat: number,
  lng: number,
  soloEmergencia = false,
) {
  const distanciaKm = sql<number>`(
    ${RADIO_TIERRA_KM} * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(${lat})) * cos(radians(${instituciones.latitud})) *
        cos(radians(${instituciones.longitud}) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(${instituciones.latitud}))
      ))
    )
  )`;

  const condiciones = [
    eq(instituciones.estaActivo, true),
    sql`${instituciones.latitud} IS NOT NULL`,
    sql`${instituciones.longitud} IS NOT NULL`,
  ];

  if (soloEmergencia) {
    condiciones.push(eq(instituciones.esEmergencia, true));
  }

  return db
    .select({
      ...getTableColumns(instituciones),
      distanciaKm,
    })
    .from(instituciones)
    .where(and(...condiciones))
    .orderBy(distanciaKm);
}

export async function obtenerInstitucionPorId(id: string) {
  const [institucion] = await db.select().from(instituciones).where(eq(instituciones.id, id));

  if (!institucion) {
    return null;
  }

  const [filasTiposCaso, sedes] = await Promise.all([
    db
      .select({ tipoCaso: tiposCaso })
      .from(tiposCaso)
      .innerJoin(institucionesTiposCaso, eq(institucionesTiposCaso.tipoCasoId, tiposCaso.id))
      .where(eq(institucionesTiposCaso.institucionId, id)),
    db.select().from(sedesInstitucion).where(eq(sedesInstitucion.institucionId, id)),
  ]);

  return {
    ...institucion,
    tiposCaso: filasTiposCaso.map((fila) => fila.tipoCaso),
    sedes,
  };
}

export type PuntoMapa = {
  institucionId: string;
  nombre: string;
  latitud: number;
  longitud: number;
  esEmergencia: boolean;
  // true si el punto viene de `sedes_institucion` (la institución no tiene
  // coordenada propia). GET /api/instituciones/cercanas no conoce las sedes,
  // así que estos puntos no deben perderse cuando se actualiza por geolocalización.
  esSede: boolean;
};

export async function listarPuntosMapa(filtros: FiltrosInstituciones = {}): Promise<PuntoMapa[]> {
  const listado = await listarInstituciones(filtros);

  const puntosDirectos: PuntoMapa[] = listado
    .filter((institucion) => institucion.latitud !== null && institucion.longitud !== null)
    .map((institucion) => ({
      institucionId: institucion.id,
      nombre: institucion.nombre,
      latitud: institucion.latitud as number,
      longitud: institucion.longitud as number,
      esEmergencia: institucion.esEmergencia,
      esSede: false,
    }));

  const idsInstituciones = listado.map((institucion) => institucion.id);
  if (idsInstituciones.length === 0) {
    return puntosDirectos;
  }

  const sedes = await db
    .select()
    .from(sedesInstitucion)
    .where(inArray(sedesInstitucion.institucionId, idsInstituciones));

  const institucionesPorId = new Map(listado.map((institucion) => [institucion.id, institucion]));

  const puntosSedes: PuntoMapa[] = sedes
    .filter((sede) => sede.latitud !== null && sede.longitud !== null)
    .map((sede) => {
      const institucion = institucionesPorId.get(sede.institucionId)!;
      return {
        institucionId: sede.institucionId,
        nombre: `${institucion.nombre} · ${sede.nombre}`,
        latitud: sede.latitud as number,
        longitud: sede.longitud as number,
        esEmergencia: institucion.esEmergencia,
        esSede: true,
      };
    });

  return [...puntosDirectos, ...puntosSedes];
}
