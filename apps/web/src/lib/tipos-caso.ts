import { ErrorStrapi, strapiGet } from './strapi';

export type TipoCaso = { id: string; nombre: string; descripcion?: string };

type TipoCasoStrapiCrudo = { documentId: string; nombre: string; descripcion?: string | null };

export async function listarTiposCaso(): Promise<TipoCaso[]> {
  const respuesta = await strapiGet<{ data: TipoCasoStrapiCrudo[] }>('/api/tipos-caso?pagination[pageSize]=100');
  return respuesta.data.map((tipoCaso) => ({
    id: tipoCaso.documentId,
    nombre: tipoCaso.nombre,
    descripcion: tipoCaso.descripcion ?? undefined,
  }));
}

export async function existeTipoCaso(id: string): Promise<boolean> {
  try {
    await strapiGet(`/api/tipos-caso/${id}`);
    return true;
  } catch (error) {
    if (error instanceof ErrorStrapi && error.status === 404) {
      return false;
    }
    throw error;
  }
}
