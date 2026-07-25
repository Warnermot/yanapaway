import type { APIRoute } from 'astro';
import { obtenerInstitucionPorId } from '../../../db/queries/instituciones';
import { jsonError, jsonOk } from '../../../lib/http';
import { esUuidValido } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id || !esUuidValido(id)) {
    return jsonError(400, 'El identificador de la institución no es válido.');
  }

  try {
    const institucion = await obtenerInstitucionPorId(id);

    if (!institucion) {
      return jsonError(404, 'Institución no encontrada.');
    }

    return jsonOk({ institucion });
  } catch (error) {
    console.error('Error al obtener institución:', error instanceof Error ? error.message : error);
    return jsonError(500, 'No se pudo obtener la institución.');
  }
};
