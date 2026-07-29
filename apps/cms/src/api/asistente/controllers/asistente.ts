import { factories } from '@strapi/strapi';

// Claves de IA desde variables de entorno — NUNCA hardcodear
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT UNIFICADO
// Un solo asistente que detecta automáticamente si la persona necesita
// información concreta (triage) o acompañamiento emocional (Yanapai),
// aplica el protocolo de riesgo en ambos casos, y responde siempre en JSON.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
Sos Yanapai, el asistente de Yanapaway, una plataforma de apoyo a personas en
situación de violencia de pareja en Bolivia. Respondés siempre en español.

════════════════════════════════════════════════
PASO 1 — DETECTAR QUÉ NECESITA LA PERSONA
════════════════════════════════════════════════

Antes de responder, evaluá el mensaje y decidí internamente:

MODO INFORMACIÓN → la persona pide algo concreto:
  - Un teléfono, dirección, institución o recurso
  - Información sobre sus derechos o un procedimiento
  - Ayuda cercana por ciudad o tipo de servicio
  Señal clave: usa "dónde", "cuál", "cómo puedo", pide un dato específico

MODO ACOMPAÑAMIENTO → la persona necesita ser escuchada:
  - Expresa una emoción, cuenta lo que le pasa
  - No pide un dato concreto sino hablar o procesar
  - Usa "no sé qué hacer", "me siento", "necesito hablar"
  Señal clave: texto emocional, narrativo, sin pregunta concreta de recurso

Ante la duda → usá MODO ACOMPAÑAMIENTO. Es el modo de menor riesgo.

════════════════════════════════════════════════
MODO INFORMACIÓN — triage acotado
════════════════════════════════════════════════

Tu función es dirigir a la persona a una de estas rutas:
  1. Ayuda urgente (instituciones de emergencia)
  2. Información sobre derechos
  3. Institución cercana por ciudad o tipo

REGLA DE DATOS INNEGOCIABLE:
Solo podés citar información que venga en el bloque CONTEXTO al final
de este prompt, extraída del CMS (instituciones reales verificadas).
NUNCA inventes ni completes un teléfono, dirección, nombre de institución
o plazo legal que no esté en ese contexto.
Si el dato no está disponible, decilo con honestidad y ofrecé lo más
cercano que tengas.

Prohibido en modo información:
- Dar asesoría legal específica ("hacé la denuncia así")
- Dar contención psicológica sostenida
- Pedir detalles del episodio más allá de ciudad y tipo de ayuda
- Sugerir que la persona confronte, denuncie o abandone la relación
- Inventar datos que no estén en el contexto

Tono: frases cortas, lenguaje simple, sin tecnicismos, sin urgencia artificial.

════════════════════════════════════════════════
MODO ACOMPAÑAMIENTO — Yanapai
════════════════════════════════════════════════

Tu función es escuchar, validar y acompañar sin apurar.
No resolvés casos, no investigás, no reemplazás terapia.

Usá el historial de la conversación que recibís:
- Si la persona dice "como te conté antes", buscá en el historial
- No repitas preguntas que ya respondió en esta misma sesión
- Si la sesión es nueva, no asumas continuidad con sesiones pasadas

El diario personal es del usuario, no tuyo:
- No menciones ni accedas al diario salvo que la persona lo traiga ella misma
- No sugieras "anotá en tu diario" para cerrar una conversación difícil

Prohibido en modo acompañamiento:
- Diagnosticar ("esto suena a depresión", "tenés estrés postraumático")
- Dar asesoría legal o procedimientos de denuncia
- Interrogar sobre detalles del abuso más allá de lo que la persona comparte
- Minimizar, cuestionar su versión, o decir que "no fue tan grave"
- Presionar una decisión (separarse, denunciar, quedarse)

Tono: cálido, en primera persona. Validá la emoción antes de sugerir nada.
Frases cortas. Sin párrafos largos que se sientan como un sermón.

════════════════════════════════════════════════
DETECCIÓN DE RIESGO — aplica en ambos modos
════════════════════════════════════════════════

Evaluá el SENTIDO COMPLETO del mensaje, no palabras sueltas.
"No tengo miedo" NO es riesgo. "Está acá ahora y tengo miedo" SÍ lo es.

Activá riesgo_detectado: true cuando el mensaje indique:
  a) Peligro físico inminente o en curso
     ("está en la casa ahora", "me encerró", "tiene un arma", "me va a lastimar")
  b) Ideación suicida o de autolesión, explícita o implícita
     ("quiero terminar con todo", "ya no aguanto más y no quiero seguir")

Si hay riesgo detectado:
  1. Cortá el flujo normal — no sigas como si nada
  2. Reconocé la gravedad en una frase breve, sin dramatizar ni minimizar
  3. Citá el número de emergencia del bloque CONTEXTO (esEmergencia: true)
  4. Recordá el botón de salida rápida de la plataforma
  5. No hagas más preguntas de triage — la acción inmediata es la prioridad
  6. Ofrecé seguir hablando, pero no lo condiciones a nada
  7. Nunca desaparezcas — quedate presente después de dar la info de emergencia

════════════════════════════════════════════════
FORMATO DE SALIDA — siempre JSON, nada más
════════════════════════════════════════════════

Respondé ÚNICAMENTE con este JSON. Sin texto antes ni después del JSON.

{
  "modo_usado": "informacion" | "acompañamiento",
  "mensaje": "texto de respuesta para mostrar al usuario",
  "emocion": null | "miedo" | "tristeza" | "enojo" | "culpa" | "alivio" | "esperanza" | "confusion" | "ansiedad" | "desesperacion" | "calma" | "neutral",
  "confianza": null | 0.0,
  "ruta_sugerida": null | "ayuda_urgente" | "mis_derechos" | "lugar_cercano" | "ninguna",
  "opciones_boton": [],
  "instituciones_citadas": [],
  "riesgo_detectado": false
}

Reglas del JSON:
- "emocion" y "confianza": completar solo en modo acompañamiento, null en modo información
- "ruta_sugerida" y "opciones_boton": completar solo en modo información, null en modo acompañamiento
- "instituciones_citadas": lista de nombres de instituciones si las citaste
- "riesgo_detectado": true solo si detectaste peligro real según las reglas de arriba
`;

// ─────────────────────────────────────────────────────────────────────────────
// Tipo de respuesta estructurada de la IA
// ─────────────────────────────────────────────────────────────────────────────
interface IAResponse {
  modo_usado: 'informacion' | 'acompañamiento';
  mensaje: string;
  emocion: string | null;
  confianza: number | null;
  ruta_sugerida: string | null;
  opciones_boton: string[];
  instituciones_citadas: string[];
  riesgo_detectado: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
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

      // 2. Obtener historial de la sesión para dar memoria a la IA
      const historial = await obtenerHistorial(strapi, sesionId);

      // 3. Obtener contexto de instituciones del CMS (RAG básico)
      const contextoRAG = await obtenerContextoCMS(strapi);

      // 4. Llamar a la IA con prompt unificado + historial + contexto
      const respuestaIA = await llamarIA(mensajeUsuario, historial, contextoRAG);

      // 5. Guardar análisis emocional si la IA lo detectó
      if (respuestaIA.emocion && respuestaIA.emocion !== 'neutral') {
        await strapi.documents('api::analisis-emocional.analisis-emocional').create({
          data: {
            mensaje: msgUsuario.documentId,
            emocion: respuestaIA.emocion as
              | 'miedo'
              | 'ansiedad'
              | 'tristeza'
              | 'desesperacion'
              | 'esperanza'
              | 'calma'
              | 'enojo'
              | 'neutral',
            confianza: respuestaIA.confianza ?? 0.6,
          },
        });
      }

      // 6. Guardar respuesta de la IA en el historial
      await strapi.documents('api::mensaje-chat.mensaje-chat').create({
        data: {
          sesion: sesionId,
          remitente: 'ia',
          mensaje: respuestaIA.mensaje,
          timestamp: new Date().toISOString(),
        },
      });

      console.timeEnd('asistente/chat');

      // 7. Devolver al frontend todos los campos del JSON estructurado
      return ctx.send({
        respuesta: respuestaIA.mensaje,          // retrocompatibilidad con el frontend actual
        mensaje: respuestaIA.mensaje,
        emocion: respuestaIA.emocion,
        confianza: respuestaIA.confianza,
        modo_usado: respuestaIA.modo_usado,
        ruta_sugerida: respuestaIA.ruta_sugerida,
        opciones_boton: respuestaIA.opciones_boton ?? [],
        instituciones_citadas: respuestaIA.instituciones_citadas ?? [],
        riesgo_detectado: respuestaIA.riesgo_detectado ?? false,
      });
    } catch (error) {
      console.timeEnd('asistente/chat');
      strapi.log.error('Error en asistente/chat:', error);
      return ctx.internalServerError('Error al procesar el mensaje.');
    }
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los últimos mensajes de la sesión para dar memoria a la IA.
 * Máximo 20 mensajes para no exceder el contexto del modelo.
 */
async function obtenerHistorial(
  strapi: any,
  sesionId: string | null
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  if (!sesionId) return [];

  try {
    const mensajes = await strapi.documents('api::mensaje-chat.mensaje-chat').findMany({
      filters: { sesion: { documentId: { $eq: sesionId } } },
      sort: { timestamp: 'asc' },
      fields: ['mensaje', 'remitente'],
      limit: 20,
    });

    return mensajes.map((m: any) => ({
      role: m.remitente === 'usuario' ? 'user' : 'assistant',
      content: m.mensaje,
    }));
  } catch {
    return [];
  }
}

// Etiquetas legibles para los tipos de institución del CMS.
// Sincronizado con el enum definido por Efraín en:
// apps/cms/src/api/institucion/content-types/institucion/schema.json
const TIPO_INSTITUCION_LABEL: Record<string, string> = {
  defensoria:       'Defensoría de la Niñez y Adolescencia',
  felcv:            'FELCV (Fuerza Especial de Lucha Contra la Violencia)',
  fiscalia:         'Fiscalía del Estado',
  policia:          'Policía Boliviana',
  slim:             'SLIM (Servicio Legal Integral Municipal)',
  linea_emergencia: 'Línea de emergencia',
  psicologico:      'Apoyo psicológico',
  ong:              'ONG / Organización civil',
  refugio:          'Refugio / Casa de acogida',
  otro:             'Otro servicio',
};

/**
 * Obtiene instituciones activas del CMS para inyectar como contexto RAG.
 * La IA solo puede citar datos que estén en este bloque — nunca inventa.
 * Usa etiquetas legibles para los tipos (FELCV, SLIM, etc.) en vez de
 * los valores internos del enum, para que la IA los entienda correctamente.
 */
async function obtenerContextoCMS(strapi: any): Promise<string> {
  try {
    const instituciones = await strapi.documents('api::institucion.institucion').findMany({
      filters: { activa: { $eq: true } },
      populate: ['telefonos'],
      fields: ['nombre', 'tipo', 'descripcion', 'direccion', 'ciudad', 'horario', 'esEmergencia', 'documentId'],
      status: 'published',
    });

    if (!instituciones || instituciones.length === 0) return '';

    const lineas = instituciones.map((inst: any) => {
      const telefonos = inst.telefonos?.map((t: any) => t.numero ?? t.value).filter(Boolean).join(', ') || 'no disponible';
      const emergencia = inst.esEmergencia ? ' ⚠️ EMERGENCIA 24H' : '';
      // Mostrar la etiqueta legible del tipo, no el valor interno del enum
      const tipoLegible = TIPO_INSTITUCION_LABEL[inst.tipo] ?? inst.tipo;
      return [
        `• ${inst.nombre}${emergencia}`,
        `  Tipo: ${tipoLegible} | Ciudad: ${inst.ciudad}`,
        `  Teléfonos: ${telefonos}`,
        inst.horario ? `  Horario: ${inst.horario}` : null,
        inst.direccion ? `  Dirección: ${inst.direccion}` : null,
        `  Descripción: ${inst.descripcion}`,
        `  ID: ${inst.documentId}`,
      ]
        .filter(Boolean)
        .join('\n');
    });

    return `\n\n════ CONTEXTO — INSTITUCIONES VERIFICADAS EN EL CMS ════\nUSÁ SOLO ESTOS DATOS. No inventes teléfonos, direcciones ni nombres.\n\n${lineas.join('\n\n')}\n════════════════════════════════════════════════════════`;
  } catch (err) {
    // Si falla el RAG, la IA continúa sin contexto y debe decirlo con honestidad
    return '';
  }
}

/**
 * Llama a la IA (Groq primero, OpenAI como fallback) con el prompt unificado,
 * el historial de sesión y el contexto RAG del CMS.
 * Parsea y devuelve el JSON estructurado de la respuesta.
 */
async function llamarIA(
  mensajeUsuario: string,
  historial: { role: 'user' | 'assistant'; content: string }[],
  contextoRAG: string
): Promise<IAResponse> {
  const systemConContexto = SYSTEM_PROMPT + contextoRAG;

  const messages = [
    { role: 'system', content: systemConContexto },
    ...historial,
    { role: 'user', content: mensajeUsuario },
  ];

  let textoRespuesta = '';

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
        messages,
        max_tokens: 600,
        temperature: 0.5,
        response_format: { type: 'json_object' }, // forzar JSON válido
      }),
    });
    const data = (await res.json()) as any;
    textoRespuesta = data.choices?.[0]?.message?.content ?? '';
  }

  // Opción 2: OpenAI (fallback)
  if (!textoRespuesta && OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 600,
        response_format: { type: 'json_object' }, // forzar JSON válido
      }),
    });
    const data = (await res.json()) as any;
    textoRespuesta = data.choices?.[0]?.message?.content ?? '';
  }

  // Parsear la respuesta JSON de la IA
  return parsearRespuestaIA(textoRespuesta);
}

/**
 * Parsea el JSON que devuelve la IA y aplica valores seguros por defecto
 * si algún campo falta o el parseo falla (fail-safe).
 */
function parsearRespuestaIA(texto: string): IAResponse {
  const fallback: IAResponse = {
    modo_usado: 'acompañamiento',
    mensaje:
      'Estoy aquí contigo. En este momento no pude procesar bien tu mensaje, pero no estás sola/o. ¿Podés contarme un poco más?',
    emocion: 'neutral',
    confianza: 0.5,
    ruta_sugerida: null,
    opciones_boton: [],
    instituciones_citadas: [],
    riesgo_detectado: false,
  };

  if (!texto) return fallback;

  try {
    // Extraer JSON aunque la IA añada texto extra alrededor
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);

    return {
      modo_usado: parsed.modo_usado === 'informacion' ? 'informacion' : 'acompañamiento',
      mensaje: typeof parsed.mensaje === 'string' && parsed.mensaje.trim()
        ? parsed.mensaje
        : fallback.mensaje,
      emocion: parsed.emocion ?? null,
      confianza: typeof parsed.confianza === 'number' ? parsed.confianza : null,
      ruta_sugerida: parsed.ruta_sugerida ?? null,
      opciones_boton: Array.isArray(parsed.opciones_boton) ? parsed.opciones_boton : [],
      instituciones_citadas: Array.isArray(parsed.instituciones_citadas) ? parsed.instituciones_citadas : [],
      riesgo_detectado: parsed.riesgo_detectado === true,
    };
  } catch {
    return fallback;
  }
}
