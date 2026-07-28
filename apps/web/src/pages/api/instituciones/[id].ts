import type { APIRoute } from 'astro';
import { obtenerInstitucionPorId } from '../../../lib/instituciones';
import { jsonError, jsonOk, registrarError } from '../../../lib/http';
import { esIdValido } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id || !esIdValido(id)) {
    return jsonError(400, 'El identificador de la institución no es válido.');
  }

  try {
    const institucion = await obtenerInstitucionPorId(id);

    if (!institucion) {
      return jsonError(404, 'Institución no encontrada.');
    }

    return jsonOk({ institucion });
  } catch (error) {
    registrarError('Error al obtener institución:', error);
    return jsonError(500, 'No se pudo obtener la institución.');
  }
};
