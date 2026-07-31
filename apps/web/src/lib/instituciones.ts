import { ErrorStrapi, strapiGet } from './strapi';
import { urlAbsolutaDeMedia } from './media';

export const TIPOS_INSTITUCION = [
  'defensoria',
  'felcv',
  'fiscalia',
  'policia',
  'slim',
  'linea_emergencia',
  'psicologico',
  'ong',
  'refugio',
  'otro',
] as const;

export type TipoInstitucion = (typeof TIPOS_INSTITUCION)[number];

export type TelefonoInstitucion = { numero: string; etiqueta?: string; esGratuito: boolean };

export type SedeInstitucion = {
  id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono?: string;
};

export type TipoCaso = { id: string; nombre: string; descripcion?: string };

export type Institucion = {
  id: string;
  nombre: string;
  tipo: TipoInstitucion;
  descripcion: string;
  direccion?: string;
  ciudad: string;
  horario?: string;
  esEmergencia: boolean;
  activa: boolean;
  telefono?: string;
  telefonos: TelefonoInstitucion[];
  imagenUrl?: string;
  imagenAlt?: string;
  latitud?: number;
  longitud?: number;
  sedes: SedeInstitucion[];
  tiposCaso: TipoCaso[];
};

export type PuntoMapa = {
  institucionId: string;
  nombre: string;
  latitud: number;
  longitud: number;
  esEmergencia: boolean;
  // true si el punto viene de una sede (la institución no tiene coordenada
  // propia). GET /api/instituciones/cercanas no conoce las sedes, así que
  // estos puntos no deben perderse cuando se actualiza por geolocalización.
  esSede: boolean;
};

type InstitucionStrapiCruda = {
  documentId: string;
  nombre: string;
  tipo: TipoInstitucion;
  descripcion: string;
  direccion?: string | null;
  ciudad: string;
  horario?: string | null;
  esEmergencia: boolean;
  activa: boolean;
  latitud?: number | null;
  longitud?: number | null;
  telefonos?: TelefonoInstitucion[];
  imagen?: { url: string; alternativeText?: string | null } | null;
  sedes?: Array<{
    documentId: string;
    nombre: string;
    direccion: string;
    latitud: number;
    longitud: number;
    telefono?: string | null;
  }>;
  tiposCaso?: Array<{ documentId: string; nombre: string; descripcion?: string | null }>;
};

function normalizarInstitucion(cruda: InstitucionStrapiCruda): Institucion {
  return {
    id: cruda.documentId,
    nombre: cruda.nombre,
    tipo: cruda.tipo,
    descripcion: cruda.descripcion,
    direccion: cruda.direccion ?? undefined,
    ciudad: cruda.ciudad,
    horario: cruda.horario ?? undefined,
    esEmergencia: cruda.esEmergencia,
    activa: cruda.activa,
    telefono: cruda.telefonos?.[0]?.numero,
    telefonos: cruda.telefonos ?? [],
    imagenUrl: cruda.imagen ? urlAbsolutaDeMedia(cruda.imagen.url) : undefined,
    imagenAlt: cruda.imagen?.alternativeText ?? undefined,
    latitud: cruda.latitud ?? undefined,
    longitud: cruda.longitud ?? undefined,
    sedes: (cruda.sedes ?? []).map((sede) => ({
      id: sede.documentId,
      nombre: sede.nombre,
      direccion: sede.direccion,
      latitud: sede.latitud,
      longitud: sede.longitud,
      telefono: sede.telefono ?? undefined,
    })),
    tiposCaso: (cruda.tiposCaso ?? []).map((tipoCaso) => ({
      id: tipoCaso.documentId,
      nombre: tipoCaso.nombre,
      descripcion: tipoCaso.descripcion ?? undefined,
    })),
  };
}

const POPULATE = 'populate[telefonos]=true&populate[sedes]=true&populate[tiposCaso]=true&populate[imagen]=true';
const RADIO_TIERRA_KM = 6371;

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const valor =
    Math.cos(radianes(lat1)) * Math.cos(radianes(lat2)) * Math.cos(radianes(lng2) - radianes(lng1)) +
    Math.sin(radianes(lat1)) * Math.sin(radianes(lat2));
  return RADIO_TIERRA_KM * Math.acos(Math.min(1, Math.max(-1, valor)));
}

export type FiltrosInstituciones = {
  tipo?: TipoInstitucion;
  tipoCasoId?: string;
};

function construirQueryFiltros(filtros: FiltrosInstituciones): string {
  const params = new URLSearchParams();
  params.set('filters[activa][$eq]', 'true');
  if (filtros.tipo) params.set('filters[tipo][$eq]', filtros.tipo);
  if (filtros.tipoCasoId) params.set('filters[tiposCaso][documentId][$eq]', filtros.tipoCasoId);
  return params.toString();
}

export async function listarInstituciones(filtros: FiltrosInstituciones = {}): Promise<Institucion[]> {
  const query = construirQueryFiltros(filtros);
  const respuesta = await strapiGet<{ data: InstitucionStrapiCruda[] }>(
    `/api/instituciones?${query}&${POPULATE}&pagination[pageSize]=100`,
  );
  return respuesta.data.map(normalizarInstitucion);
}

export async function obtenerInstitucionPorId(id: string): Promise<Institucion | null> {
  try {
    const respuesta = await strapiGet<{ data: InstitucionStrapiCruda }>(`/api/instituciones/${id}?${POPULATE}`);
    return normalizarInstitucion(respuesta.data);
  } catch (error) {
    if (error instanceof ErrorStrapi && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export type InstitucionConDistancia = Institucion & { latitud: number; longitud: number; distanciaKm: number };

export async function listarInstitucionesCercanas(
  lat: number,
  lng: number,
  soloEmergencia = false,
): Promise<InstitucionConDistancia[]> {
  const params = new URLSearchParams();
  params.set('filters[activa][$eq]', 'true');
  params.set('filters[latitud][$notNull]', 'true');
  params.set('filters[longitud][$notNull]', 'true');
  if (soloEmergencia) {
    params.set('filters[esEmergencia][$eq]', 'true');
  }

  const respuesta = await strapiGet<{ data: InstitucionStrapiCruda[] }>(
    `/api/instituciones?${params.toString()}&${POPULATE}&pagination[pageSize]=100`,
  );

  return respuesta.data
    .map(normalizarInstitucion)
    .filter(
      (institucion): institucion is InstitucionConDistancia =>
        institucion.latitud !== undefined && institucion.longitud !== undefined,
    )
    .map((institucion) => ({
      ...institucion,
      distanciaKm: distanciaKm(lat, lng, institucion.latitud, institucion.longitud),
    }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm);
}

export async function listarPuntosMapa(filtros: FiltrosInstituciones = {}): Promise<PuntoMapa[]> {
  const listado = await listarInstituciones(filtros);

  const puntosDirectos: PuntoMapa[] = listado
    .filter(
      (institucion): institucion is Institucion & { latitud: number; longitud: number } =>
        institucion.latitud !== undefined && institucion.longitud !== undefined,
    )
    .map((institucion) => ({
      institucionId: institucion.id,
      nombre: institucion.nombre,
      latitud: institucion.latitud,
      longitud: institucion.longitud,
      esEmergencia: institucion.esEmergencia,
      esSede: false,
    }));

  const puntosSedes: PuntoMapa[] = listado.flatMap((institucion) =>
    institucion.sedes.map((sede) => ({
      institucionId: institucion.id,
      nombre: `${institucion.nombre} · ${sede.nombre}`,
      latitud: sede.latitud,
      longitud: sede.longitud,
      esEmergencia: institucion.esEmergencia,
      esSede: true,
    })),
  );

  return [...puntosDirectos, ...puntosSedes];
}
