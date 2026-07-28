import type { APIRoute } from 'astro';
import { listarInstitucionesCercanas } from '../../../lib/instituciones';
import { jsonError, jsonOk, registrarError } from '../../../lib/http';

export const prerender = false;

function parsearCoordenada(valor: string | null, min: number, max: number): number | undefined {
  if (valor === null) return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= min && numero <= max ? numero : undefined;
}

export const GET: APIRoute = async ({ url }) => {
  const lat = parsearCoordenada(url.searchParams.get('lat'), -90, 90);
  const lng = parsearCoordenada(url.searchParams.get('lng'), -180, 180);

  if (lat === undefined || lng === undefined) {
    return jsonError(
      400,
      'Los parámetros "lat" y "lng" son obligatorios y deben ser coordenadas válidas.',
    );
  }

  const soloEmergencia = url.searchParams.get('emergencia') === 'true';

  try {
    const instituciones = await listarInstitucionesCercanas(lat, lng, soloEmergencia);
    return jsonOk({ instituciones });
  } catch (error) {
    registrarError('Error al listar instituciones cercanas:', error);
    return jsonError(500, 'No se pudo obtener instituciones cercanas.');
  }
};
