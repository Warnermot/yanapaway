import { errors } from '@strapi/utils';
import type { Core } from '@strapi/strapi';

const UIDS = new Set(['api::historia.historia', 'api::comentario-historia.comentario-historia']);

/**
 * Regla del subproducto /blog: el contenido lo envían personas anónimas, sin
 * cuenta ni login, así que la única barrera real contra información falsa u
 * ofensiva es que un gestor lo apruebe antes de que sea visible.
 *
 * Esa aprobación se apoya en Draft & Publish, y este middleware es lo que la
 * hace real: crear por la Content API NO deja un borrador por sí solo (ver el
 * detalle en el `create` de abajo). Sin esto, /blog publicaría cada testimonio
 * en el momento en que se envía. Lo que garantiza:
 *
 *  - un `create` desde la Content API siempre queda en borrador;
 *  - publicar (`publish`, o `update` con status 'published') desde la Content
 *    API se rechaza: publicar es una acción del panel, de una persona;
 *  - borrar desde la Content API se rechaza (el token del sitio tampoco tiene
 *    ese permiso — esto es la segunda cerradura).
 *
 * Vive en el document service, no en un lifecycle hook, porque en Strapi 5
 * `publish` es una acción propia del document service, separada de `update`
 * (mismo criterio que middlewares/institucion-reglas.ts).
 *
 * El panel de administración y los scripts locales (seed, tests, cron) usan el
 * document service directamente, sin contexto de pedido HTTP: para ellos no
 * hay restricción, que es justo lo que necesita quien modera.
 */
export function blogModeracion({ strapi }: { strapi: Core.Strapi }): void {
  const prefijoContentApi = strapi.config.get<string>('api.rest.prefix', '/api');

  // `strapi.requestContext` es un AsyncLocalStorage con el ctx de Koa del
  // pedido en curso. Devuelve undefined cuando no hay pedido HTTP (CLI, seed,
  // cron, tests que llaman al document service directo).
  function vieneDeContentApi(): boolean {
    const ctx = strapi.requestContext.get();
    const ruta = ctx?.request?.path;

    if (!ruta) {
      return false;
    }

    return ruta === prefijoContentApi || ruta.startsWith(`${prefijoContentApi}/`);
  }

  strapi.documents.use(async (ctx, next) => {
    if (!UIDS.has(ctx.uid) || !vieneDeContentApi()) {
      return next();
    }

    if (ctx.action === 'publish' || ctx.action === 'unpublish') {
      throw new errors.ApplicationError(
        'Publicar o despublicar contenido de /blog solo se hace desde el panel de administración: cada historia y cada mensaje de apoyo los revisa una persona antes de que sean visibles.'
      );
    }

    if (ctx.action === 'delete') {
      throw new errors.ApplicationError(
        'Borrar contenido de /blog solo se hace desde el panel de administración.'
      );
    }

    const params = ctx.params as { status?: string };

    // Esta línea es LO QUE HACE que exista la cola de moderación, no una
    // segunda cerradura sobre el default de Strapi.
    //
    // Contra lo que se suele suponer, un `create` por la Content API NO deja un
    // borrador: `CoreService.getFetchParams` (@strapi/core, core-api/service/
    // core-service.ts) inyecta `status: 'published'` en todas las llamadas del
    // core service, incluida `create` (core-api/service/collection-type.ts).
    // Verificado en 5.51.0. Sin este `params.status = 'draft'`, cada historia
    // enviada desde /blog quedaría publicada en el mismo pedido, sin que nadie
    // la lea. Ver tests/blog-moderacion.test.ts.
    if (ctx.action === 'create') {
      params.status = 'draft';
      return next();
    }

    if (ctx.action === 'update' && params.status === 'published') {
      throw new errors.ApplicationError(
        'No se puede publicar contenido de /blog desde la API. La revisión se hace desde el panel de administración.'
      );
    }

    return next();
  });
}
