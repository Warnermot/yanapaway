import { createHmac } from 'crypto';
import type { Core } from '@strapi/strapi';

// El brief pide que publicar o despublicar contenido dispare una
// reconstrucción del sitio Astro (webhook), pero agrupada: si varias
// publicaciones ocurren en poco tiempo, una sola reconstrucción, no una por
// cambio. Los webhooks nativos de Strapi disparan uno por evento, así que
// esto se implementa a mano con un debounce trailing.
//
// Las ventanas son configurables por env var, sobre todo para que los tests
// de integración (que arrancan la app real desde dist/, con timers reales
// que Jest no puede acelerar desde el proceso de test) puedan usar ventanas
// de milisegundos en vez de esperar minutos.
const TRAILING_MS = Number.parseInt(process.env.REBUILD_DEBOUNCE_MS ?? '60000', 10);
const MAX_WAIT_MS = Number.parseInt(process.env.REBUILD_MAX_WAIT_MS ?? '300000', 10);
const MAX_INTENTOS = 3;

let timer: ReturnType<typeof setTimeout> | null = null;
let firstScheduledAt: number | null = null;
let pending = false;
let strapiRef: Core.Strapi | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postConReintentos(strapi: Core.Strapi): Promise<void> {
  const url = process.env.REBUILD_WEBHOOK_URL;

  if (!url) {
    strapi.log.info('[rebuild] REBUILD_WEBHOOK_URL no está seteada; no se dispara ninguna reconstrucción.');
    return;
  }

  const secret = process.env.REBUILD_WEBHOOK_SECRET ?? '';
  const body = JSON.stringify({ event: 'rebuild', triggeredAt: new Date().toISOString() });
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  for (let intento = 1; intento <= MAX_INTENTOS; intento += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rebuild-Signature': signature,
        },
        body,
      });

      if (!res.ok) {
        throw new Error(`respuesta HTTP ${res.status}`);
      }

      strapi.log.info('[rebuild] Reconstrucción del sitio disparada correctamente.');
      return;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      strapi.log.warn(`[rebuild] Intento ${intento}/${MAX_INTENTOS} de disparar la reconstrucción falló: ${mensaje}`);

      if (intento < MAX_INTENTOS) {
        await sleep(2 ** intento * 1000);
      }
    }
  }

  strapi.log.error(`[rebuild] No se pudo disparar la reconstrucción del sitio tras ${MAX_INTENTOS} intentos.`);
}

function flush(): void {
  timer = null;
  firstScheduledAt = null;
  const strapi = strapiRef;
  strapiRef = null;

  if (!pending || !strapi) {
    pending = false;
    return;
  }

  pending = false;
  postConReintentos(strapi).catch((error) => {
    strapi.log.error('[rebuild] Error inesperado disparando la reconstrucción:', error);
  });
}

/**
 * Agenda una reconstrucción agrupada. Fire-and-forget: no bloquea al
 * llamador (un document service middleware) esperando el POST real.
 */
export function scheduleRebuild({ strapi }: { strapi: Core.Strapi }): void {
  pending = true;
  strapiRef = strapi;

  const now = Date.now();
  if (firstScheduledAt === null) {
    firstScheduledAt = now;
  }

  if (timer) {
    clearTimeout(timer);
  }

  const transcurrido = now - firstScheduledAt;
  const restanteHastaMaxWait = MAX_WAIT_MS - transcurrido;
  const delay = Math.max(0, Math.min(TRAILING_MS, restanteHastaMaxWait));

  timer = setTimeout(flush, delay);
  // Un debounce pendiente no debe ser razón para mantener vivo el proceso.
  // En producción el servidor HTTP ya lo mantiene arriba y el timer dispara
  // igual; en los tests, donde la app se apaga en cuanto termina el archivo,
  // esto evita que Jest quede colgado hasta que venza la ventana.
  timer.unref?.();
}

/** Solo para tests: limpia el estado del debounce entre casos. */
export function __resetDebounceStateForTests(): void {
  if (timer) {
    clearTimeout(timer);
  }
  timer = null;
  firstScheduledAt = null;
  pending = false;
  strapiRef = null;
}
