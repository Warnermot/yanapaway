import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { db } from '../client';
import { institucionesTiposCaso, instituciones, tiposCaso, tipoInstitucionEnum } from '../schema';

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

  const filasTiposCaso = await db
    .select({ tipoCaso: tiposCaso })
    .from(tiposCaso)
    .innerJoin(institucionesTiposCaso, eq(institucionesTiposCaso.tipoCasoId, tiposCaso.id))
    .where(eq(institucionesTiposCaso.institucionId, id));

  return {
    ...institucion,
    tiposCaso: filasTiposCaso.map((fila) => fila.tipoCaso),
  };
}
