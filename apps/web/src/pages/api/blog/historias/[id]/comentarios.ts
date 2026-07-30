import type { APIRoute } from 'astro';
import { hashearIp } from '../../../../../lib/hash-ip';
import { crearComentario, obtenerHistoriaPorId } from '../../../../../lib/historias';
import { jsonError, jsonOk, registrarError } from '../../../../../lib/http';
import { nombreParaMostrar, resolverNombrePublico } from '../../../../../lib/nombre-publico';
import { excedeLimite } from '../../../../../lib/rate-limit';
import { normalizarTextoPlano } from '../../../../../lib/texto';
import { esIdValido } from '../../../../../lib/validation';

export const prerender = false;

// Los mismos límites que declara el schema del CMS (apps/cms/.../comentario-historia).
const CONTENIDO_MIN = 2;
const CONTENIDO_MAX = 2000;

const LIMITE_INTENTOS = 15;
const VENTANA_MS = 10 * 60 * 1000;

export const POST: APIRoute = async ({ request, params, clientAddress }) => {
  if (excedeLimite(`blog-comentario:${clientAddress ?? 'desconocido'}`, LIMITE_INTENTOS, VENTANA_MS)) {
    return jsonError(429, 'Recibimos varios mensajes desde aquí hace poco. Intenta de nuevo más tarde.');
  }

  const id = params.id;
  if (!id || !esIdValido(id)) {
    return jsonError(400, 'El identificador de la historia no es válido.');
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return jsonError(400, 'El cuerpo de la solicitud debe ser JSON válido.');
  }

  const resultado = validarComentario(cuerpo);
  if (!resultado.valido) {
    return jsonError(400, resultado.error);
  }

  // Solo se puede comentar una historia ya aprobada: `obtenerHistoriaPorId`
  // lee únicamente lo publicado, así que un borrador pendiente da 404 igual
  // que una historia inexistente.
  try {
    if (!(await obtenerHistoriaPorId(id))) {
      return jsonError(404, 'Esta historia no está disponible.');
    }
  } catch (error) {
    registrarError('Error al verificar la historia antes de comentar:', error);
    return jsonError(500, 'No pudimos enviar tu mensaje. Vuelve a intentarlo en un momento.');
  }

  try {
    await crearComentario({
      contenido: resultado.contenido,
      historiaId: id,
      alias: resultado.alias,
      ipHash: hashearIp(clientAddress),
    });

    return jsonOk({ alias: nombreParaMostrar(resultado.alias), pendienteDeRevision: true }, 201);
  } catch (error) {
    registrarError('Error al registrar un mensaje de apoyo:', error);
    return jsonError(500, 'No pudimos enviar tu mensaje. Vuelve a intentarlo en un momento.');
  }
};

type ResultadoValidacion =
  | { valido: true; contenido: string; alias: string | undefined }
  | { valido: false; error: string };

function validarComentario(cuerpo: unknown): ResultadoValidacion {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return { valido: false, error: 'Cuerpo de la solicitud inválido.' };
  }

  const { contenido, nombre, anonima } = cuerpo as Record<string, unknown>;

  if (typeof contenido !== 'string') {
    return { valido: false, error: 'Falta el contenido del mensaje.' };
  }

  const normalizado = normalizarTextoPlano(contenido);

  if (normalizado.length < CONTENIDO_MIN || normalizado.length > CONTENIDO_MAX) {
    return {
      valido: false,
      error: `Tu mensaje debe tener entre ${CONTENIDO_MIN} y ${CONTENIDO_MAX} caracteres.`,
    };
  }

  const firma = resolverNombrePublico(nombre, anonima);
  if (!firma.valido) {
    return { valido: false, error: firma.error };
  }

  return { valido: true, contenido: normalizado, alias: firma.alias };
}
