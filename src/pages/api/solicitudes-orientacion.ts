import type { APIRoute } from 'astro';
import { crearSolicitudOrientacion } from '../../db/queries/solicitudes';
import { jsonError, jsonOk } from '../../lib/http';
import { excedeLimite } from '../../lib/rate-limit';
import { esUuidValido } from '../../lib/validation';

export const prerender = false;

const MENSAJE_MIN = 10;
const MENSAJE_MAX = 2000;
const CONTACTO_MAX = 200;

const LIMITE_INTENTOS = 5;
const VENTANA_MS = 10 * 60 * 1000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (excedeLimite(clientAddress ?? 'desconocido', LIMITE_INTENTOS, VENTANA_MS)) {
    return jsonError(429, 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.');
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return jsonError(400, 'El cuerpo de la solicitud debe ser JSON válido.');
  }

  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return jsonError(400, 'Cuerpo de la solicitud inválido.');
  }

  const { institucionId, tipoCasoId, mensaje, infoContacto } = cuerpo as Record<string, unknown>;

  if (
    institucionId !== undefined &&
    (typeof institucionId !== 'string' || !esUuidValido(institucionId))
  ) {
    return jsonError(400, 'El identificador de institución no es válido.');
  }

  if (tipoCasoId !== undefined && (typeof tipoCasoId !== 'string' || !esUuidValido(tipoCasoId))) {
    return jsonError(400, 'El identificador de tipo de caso no es válido.');
  }

  if (
    typeof mensaje !== 'string' ||
    mensaje.trim().length < MENSAJE_MIN ||
    mensaje.length > MENSAJE_MAX
  ) {
    return jsonError(400, `El mensaje debe tener entre ${MENSAJE_MIN} y ${MENSAJE_MAX} caracteres.`);
  }

  if (infoContacto !== undefined && (typeof infoContacto !== 'string' || infoContacto.length > CONTACTO_MAX)) {
    return jsonError(400, 'La información de contacto no es válida.');
  }

  try {
    // No se registra el mensaje ni la info de contacto en logs del servidor.
    const solicitud = await crearSolicitudOrientacion({
      institucionId,
      tipoCasoId,
      mensaje: mensaje.trim(),
      infoContacto,
    });
    return jsonOk({ solicitud }, 201);
  } catch (error) {
    console.error('Error al crear solicitud de orientación:', error instanceof Error ? error.name : 'desconocido');
    return jsonError(500, 'No se pudo registrar la solicitud.');
  }
};
