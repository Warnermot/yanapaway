import type { APIRoute } from 'astro';
import { generarAlias } from '../../../lib/alias';
import { hashearIp } from '../../../lib/hash-ip';
import { crearHistoria, esCategoriaValida, type CategoriaHistoria } from '../../../lib/historias';
import { jsonError, jsonOk, registrarError } from '../../../lib/http';
import { excedeLimite } from '../../../lib/rate-limit';
import { normalizarTextoPlano } from '../../../lib/texto';

export const prerender = false;

// Los mismos límites que declara el schema del CMS (apps/cms/.../historia).
const CONTENIDO_MIN = 20;
const CONTENIDO_MAX = 8000;

// Escribir un testimonio lleva tiempo: cinco en quince minutos es holgado para
// una persona y estrecho para un script.
const LIMITE_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (excedeLimite(`blog-historia:${clientAddress ?? 'desconocido'}`, LIMITE_INTENTOS, VENTANA_MS)) {
    return jsonError(429, 'Recibimos varias publicaciones desde aquí hace poco. Intenta de nuevo más tarde.');
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return jsonError(400, 'El cuerpo de la solicitud debe ser JSON válido.');
  }

  const resultado = validarHistoria(cuerpo);
  if (!resultado.valido) {
    return jsonError(400, resultado.error);
  }

  try {
    // Nunca se loguea el contenido de una historia, ni en caso de error.
    const { alias } = await crearHistoria({
      contenido: resultado.contenido,
      categoria: resultado.categoria,
      alias: generarAlias(),
      ipHash: hashearIp(clientAddress),
    });

    return jsonOk({ alias, pendienteDeRevision: true }, 201);
  } catch (error) {
    registrarError('Error al registrar una historia del blog:', error);
    return jsonError(500, 'No pudimos guardar tu historia. Vuelve a intentarlo en un momento.');
  }
};

type ResultadoValidacion =
  | { valido: true; contenido: string; categoria: CategoriaHistoria }
  | { valido: false; error: string };

function validarHistoria(cuerpo: unknown): ResultadoValidacion {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return { valido: false, error: 'Cuerpo de la solicitud inválido.' };
  }

  const { contenido, categoria } = cuerpo as Record<string, unknown>;

  if (typeof contenido !== 'string') {
    return { valido: false, error: 'Falta el contenido de la historia.' };
  }

  // Se normaliza ANTES de medir: si no, 25 caracteres de espacios y saltos
  // pasan el mínimo de 20 y se guarda una historia vacía.
  const normalizado = normalizarTextoPlano(contenido);

  if (normalizado.length < CONTENIDO_MIN || normalizado.length > CONTENIDO_MAX) {
    return {
      valido: false,
      error: `Tu historia debe tener entre ${CONTENIDO_MIN} y ${CONTENIDO_MAX} caracteres.`,
    };
  }

  // El prototipo silenciaba una categoría desconocida a 'general'. Acá se
  // rechaza: si el sitio manda algo que el CMS no acepta, es un bug del sitio y
  // conviene que se vea, no que se guarde el testimonio en el cajón equivocado.
  if (!esCategoriaValida(categoria)) {
    return { valido: false, error: 'La categoría indicada no es válida.' };
  }

  return { valido: true, contenido: normalizado, categoria };
}
