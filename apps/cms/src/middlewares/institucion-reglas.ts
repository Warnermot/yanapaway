import { errors } from '@strapi/utils';
import type { Core } from '@strapi/strapi';
import { estaVencida, verificacionMaxDias } from '../lib/verificacion';

const UID = 'api::institucion.institucion';

/**
 * Regla no negociable del brief: no se puede publicar ni mantener publicada
 * una institución cuya `verificadoEn` tenga más de VERIFICACION_MAX_DIAS
 * (180 por defecto). Vive acá — en el document service, no en un lifecycle
 * hook ni en validación de formulario — porque `publish` es una acción
 * propia del document service en Strapi 5, separada de `update`, y porque
 * así no se puede saltear vía API.
 *
 * También bloquea el borrado físico: una institución se da de baja con
 * `activa = false`, nunca se borra el registro.
 */
export function institucionReglas({ strapi }: { strapi: Core.Strapi }): void {
  strapi.documents.use(async (ctx, next) => {
    if (ctx.uid !== UID) {
      return next();
    }

    if (ctx.action === 'delete') {
      throw new errors.ApplicationError(
        'No se puede borrar una institución. Para darla de baja, marcá "activa" en falso — un dato de contacto que dejó de operar sigue siendo información histórica útil.'
      );
    }

    const params = ctx.params as { documentId?: string; data?: { verificadoEn?: unknown }; status?: string };
    // Solo acciones de escritura: un findMany/findOne con status:'published'
    // como FILTRO DE LECTURA no es una intención de publicar.
    const accionesDeEscritura = new Set(['create', 'update', 'publish']);
    const intentaPublicar =
      accionesDeEscritura.has(ctx.action) && (ctx.action === 'publish' || params.status === 'published');

    if (intentaPublicar) {
      let verificadoEn = params.data?.verificadoEn;

      if (verificadoEn === undefined && params.documentId) {
        const existente = await strapi.documents(UID).findOne({ documentId: params.documentId });
        verificadoEn = existente?.verificadoEn ?? undefined;
      }

      if (estaVencida(verificadoEn)) {
        throw new errors.ApplicationError(
          `No se puede publicar: la fecha de verificación de datos ("verificadoEn") falta o tiene más de ${verificacionMaxDias()} días. Confirmá que el teléfono y los datos de contacto siguen vigentes y actualizá la fecha de verificación antes de publicar.`
        );
      }
    }

    return next();
  });
}
