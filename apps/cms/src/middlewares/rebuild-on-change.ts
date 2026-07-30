import type { Core } from '@strapi/strapi';
import { scheduleRebuild } from '../services/rebuild-trigger';

// Contenido con draft & publish: solo dispara reconstrucción cuando algo
// queda efectivamente publicado o despublicado (no en cada guardado de
// borrador). `unpublish` incluye al despublicado automático del cron de
// vigencia (src/cron/despublicar-vencidas.ts) — un teléfono retirado
// también necesita reconstruir el sitio.
const UIDS_CON_DRAFT_PUBLISH = new Set(['api::pagina.pagina', 'api::institucion.institucion']);
const ACCIONES_DRAFT_PUBLISH = new Set(['publish', 'unpublish']);

// Contenido sin draft & publish: siempre está "vivo", cualquier cambio debe
// reflejarse en el sitio.
const UIDS_SIEMPRE_VIVOS = new Set([
  'api::categoria-recurso.categoria-recurso',
  'api::sobre-el-proyecto.sobre-el-proyecto',
  'api::terminos.terminos',
  'api::privacidad.privacidad',
]);
const ACCIONES_SIEMPRE_VIVOS = new Set(['create', 'update', 'delete']);

export function rebuildOnChange({ strapi }: { strapi: Core.Strapi }): void {
  strapi.documents.use(async (ctx, next) => {
    const resultado = await next();

    const params = ctx.params as { status?: string };
    const disparaPorDraftPublish = UIDS_CON_DRAFT_PUBLISH.has(ctx.uid) && ACCIONES_DRAFT_PUBLISH.has(ctx.action);
    // create/update con status 'published' = crear-y-publicar o editar-y-publicar
    // en un solo paso; no pasa por la acción `publish` pero sí cambia lo que ve el sitio.
    const disparaPorEscrituraPublicada =
      UIDS_CON_DRAFT_PUBLISH.has(ctx.uid) &&
      (ctx.action === 'create' || ctx.action === 'update') &&
      params.status === 'published';
    const disparaPorSiempreVivo = UIDS_SIEMPRE_VIVOS.has(ctx.uid) && ACCIONES_SIEMPRE_VIVOS.has(ctx.action);

    if (disparaPorDraftPublish || disparaPorEscrituraPublicada || disparaPorSiempreVivo) {
      scheduleRebuild({ strapi });
    }

    return resultado;
  });
}
