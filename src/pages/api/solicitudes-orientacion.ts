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

  const cuerpoRecibido = cuerpo as Record<string, unknown>;
  const institucionId = cuerpoRecibido.institucionId ?? undefined;
  const tipoCasoId = cuerpoRecibido.tipoCasoId ?? undefined;
  const mensaje = cuerpoRecibido.mensaje;
  const infoContacto = cuerpoRecibido.infoContacto ?? undefined;

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
    // 23503 = foreign_key_violation: el institucionId o tipoCasoId tiene
    // formato válido pero no existe. Es un error del cliente, no del servidor.
    if (esErrorDeClavesForaneas(error)) {
      return jsonError(400, 'La institución o el tipo de caso indicado no existe.');
    }

    console.error('Error al crear solicitud de orientación:', error instanceof Error ? error.name : 'desconocido');
    return jsonError(500, 'No se pudo registrar la solicitud.');
  }
};

function esErrorDeClavesForaneas(error: unknown): boolean {
  // Drizzle envuelve el error real de `pg` en `.cause`; el código de
  // Postgres para foreign_key_violation vive ahí, no en el objeto externo.
  const causa = error instanceof Error ? error.cause : undefined;
  return typeof causa === 'object' && causa !== null && 'code' in causa && causa.code === '23503';
}
