import type { APIRoute } from 'astro';
import { listarInstituciones, type TipoInstitucion } from '../../../db/queries/instituciones';
import { tipoInstitucionEnum } from '../../../db/schema';
import { jsonError, jsonOk, registrarError } from '../../../lib/http';
import { esUuidValido } from '../../../lib/validation';

export const prerender = false;

const TIPOS_VALIDOS = new Set<string>(tipoInstitucionEnum.enumValues);

export const GET: APIRoute = async ({ url }) => {
  const tipoParam = url.searchParams.get('tipo');
  const tipoCasoParam = url.searchParams.get('tipo_caso');

  if (tipoParam && !TIPOS_VALIDOS.has(tipoParam)) {
    return jsonError(400, 'El parámetro "tipo" no es válido.');
  }

  if (tipoCasoParam && !esUuidValido(tipoCasoParam)) {
    return jsonError(400, 'El parámetro "tipo_caso" no es válido.');
  }

  try {
    const instituciones = await listarInstituciones({
      tipo: (tipoParam as TipoInstitucion) || undefined,
      tipoCasoId: tipoCasoParam || undefined,
    });
    return jsonOk({ instituciones });
  } catch (error) {
    registrarError('Error al listar instituciones:', error);
    return jsonError(500, 'No se pudo obtener el listado de instituciones.');
  }
};
