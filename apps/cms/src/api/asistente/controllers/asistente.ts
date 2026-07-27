import { factories } from '@strapi/strapi';

// Clave de IA desde variables de entorno — NUNCA hardcodear
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY; // alternativa gratuita

const SYSTEM_PROMPT = `
Eres un asistente de superación personal empático y profesional llamado Yanapa.
Estás hablando con alguien que puede estar atravesando una situación de violencia,
conflicto de pareja o vulnerabilidad emocional.

Reglas estrictas:
- Tu tono es siempre calmado, contenedor, sin juzgar y orientado a la esperanza.
- No das diagnósticos médicos ni psicológicos.
- No das consejos legales concretos.
- Si detectas riesgo inmediato para la vida, recuerda amablemente que existe el botón SOS en la plataforma.
- Nunca incluyas datos personales del usuario en tus respuestas.
- Responde siempre en español.
- Limita tus respuestas a máximo 3 párrafos cortos para no abrumar al usuario.
`;

export default factories.createCoreController('api::sesion-chat.sesion-chat', ({ strapi }) => ({
  async enviarMensaje(ctx) {
    // RR-01: el backend debe responder en menos de 3 segundos (medible en logs)
    console.time('asistente/chat');

    const { mensajeUsuario, sesionId, usuarioId } = ctx.request.body;

    if (!mensajeUsuario || !usuarioId) {
      console.timeEnd('asistente/chat');
      return ctx.badRequest('Faltan campos requeridos: mensajeUsuario y usuarioId.');
    }

    try {
      // 1. Guardar mensaje del usuario
      const msgUsuario = await strapi.documents('api::mensaje-chat.mensaje-chat').create({
        data: {
          sesion: sesionId,
          remitente: 'usuario',
          mensaje: mensajeUsuario,
          timestamp: new Date().toISOString(),
        },
      });

      // 2. Llamar a la API de IA (usar Groq si no hay OpenAI configurado)
      const respuestaIA = await llamarIA(mensajeUsuario);

      // 3. Análisis emocional simple (basado en palabras clave — reemplazar con NLP real)
      const emocionDetectada = detectarEmocion(mensajeUsuario);

      // 4. Guardar análisis emocional
      await strapi.documents('api::analisis-emocional.analisis-emocional').create({
        data: {
          mensaje: msgUsuario.documentId,
          emocion: emocionDetectada.emocion as
            | 'miedo'
            | 'ansiedad'
            | 'tristeza'
            | 'desesperacion'
            | 'esperanza'
            | 'calma'
            | 'enojo'
            | 'neutral',
          confianza: emocionDetectada.confianza,
        },
      });

      // 5. Guardar respuesta de la IA
      await strapi.documents('api::mensaje-chat.mensaje-chat').create({
        data: {
          sesion: sesionId,
          remitente: 'ia',
          mensaje: respuestaIA,
          timestamp: new Date().toISOString(),
        },
      });

      console.timeEnd('asistente/chat');
      return ctx.send({ respuesta: respuestaIA, emocion: emocionDetectada.emocion });
    } catch (error) {
      console.timeEnd('asistente/chat');
      strapi.log.error('Error en asistente/chat:', error);
      return ctx.internalServerError('Error al procesar el mensaje.');
    }
  },
}));

// --- Helpers ---

async function llamarIA(mensajeUsuario: string): Promise<string> {
  // Opción 1: Groq (gratuito, recomendado para desarrollo)
  if (GROQ_API_KEY) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: mensajeUsuario },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content ?? 'Estoy aquí contigo. ¿Puedes contarme un poco más?';
  }

  // Opción 2: OpenAI (fallback)
  if (OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: mensajeUsuario },
        ],
        max_tokens: 400,
      }),
    });
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content ?? 'Estoy aquí contigo.';
  }

  return 'Estoy aquí contigo. En este momento no puedo conectarme al asistente, pero recuerda que no estás solo/a.';
}

function detectarEmocion(texto: string): { emocion: string; confianza: number } {
  const t = texto.toLowerCase();
  if (/miedo|terror|aterrad|asustad/.test(t)) return { emocion: 'miedo', confianza: 0.8 };
  if (/ansios|nervios|angustia|preocup/.test(t)) return { emocion: 'ansiedad', confianza: 0.78 };
  if (/triste|llor|deprim|solo|sola/.test(t)) return { emocion: 'tristeza', confianza: 0.8 };
  if (/no puedo más|desesper|sin salida/.test(t)) return { emocion: 'desesperacion', confianza: 0.85 };
  if (/esper|mejor|puedo|fuerza|gracias/.test(t)) return { emocion: 'esperanza', confianza: 0.75 };
  if (/calm|tranquil|bien|estable/.test(t)) return { emocion: 'calma', confianza: 0.72 };
  if (/rabia|enojo|odio|coraje/.test(t)) return { emocion: 'enojo', confianza: 0.78 };
  return { emocion: 'neutral', confianza: 0.6 };
}
