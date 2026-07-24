import type { Core } from '@strapi/strapi';
import { enforceSecurityPolicy } from './bootstrap/security-policy';
import { institucionReglas } from './middlewares/institucion-reglas';
import { rebuildOnChange } from './middlewares/rebuild-on-change';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    institucionReglas({ strapi });
    rebuildOnChange({ strapi });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await enforceSecurityPolicy({ strapi });

    // Se corre de nuevo justo cuando el servidor confirma que ya está
    // escuchando conexiones. `enforceSecurityPolicy` es idempotente (solo
    // escribe y loguea cuando algo realmente cambió), así que repetirla acá
    // no tiene costo si ya quedó todo bien en el primer paso — pero si algún
    // plugin (de Strapi o de terceros) reintroduce permisos por defecto en
    // una etapa tardía del arranque, esta segunda pasada lo corrige antes
    // de que el servidor empiece a responder pedidos.
    strapi.server.httpServer.once('listening', () => {
      enforceSecurityPolicy({ strapi }).catch((error) => {
        strapi.log.error('[bootstrap] Falló la segunda pasada de enforceSecurityPolicy tras "listening":', error);
      });
    });
  },
};
