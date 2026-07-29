import type { Core } from '@strapi/strapi';
import { VERIFICACION_AVISO_DIAS, diasDesde, verificacionMaxDias } from '../lib/verificacion';

const UID = 'api::institucion.institucion';

type InstitucionMin = {
  documentId: string;
  nombre: string;
  verificadoEn: unknown;
};

export type ResultadoSweep = {
  despublicadas: number;
  porVencerPronto: number;
};

/**
 * Segunda mitad de la regla de los 180 días: el middleware en
 * institucion-reglas.ts bloquea PUBLICAR una institución vencida, pero no
 * hay ningún gatillo que revise una institución que YA estaba publicada y
 * venció con el paso del tiempo — nadie vuelve a tocar ese registro. Este
 * job corre a diario (ver config/cron-tasks.ts) y hace esa revisión:
 * despublica (nunca borra) lo vencido, y avisa por log lo que está por
 * vencer, para que los gestores puedan reverificar antes de que desaparezca
 * del sitio.
 */
export async function despublicarInstitucionesVencidas({
  strapi,
}: {
  strapi: Core.Strapi;
}): Promise<ResultadoSweep> {
  const maxDias = verificacionMaxDias();

  const publicadas = (await strapi.documents(UID).findMany({
    status: 'published',
    fields: ['documentId', 'nombre', 'verificadoEn'],
  })) as unknown as InstitucionMin[];

  let despublicadas = 0;
  let porVencerPronto = 0;

  for (const institucion of publicadas) {
    const dias = diasDesde(institucion.verificadoEn);

    if (dias === null || dias > maxDias) {
      await strapi.documents(UID).unpublish({ documentId: institucion.documentId });
      strapi.log.warn(
        `[cron] Despublicada institución "${institucion.nombre}" (${institucion.documentId}): verificación vencida o faltante ("verificadoEn"). Reverificar los datos de contacto y volver a publicar.`
      );
      despublicadas += 1;
      continue;
    }

    if (dias > maxDias - VERIFICACION_AVISO_DIAS) {
      const diasRestantes = Math.max(0, Math.ceil(maxDias - dias));
      strapi.log.warn(
        `[cron] La institución "${institucion.nombre}" (${institucion.documentId}) vence su verificación en ${diasRestantes} día(s). Conviene reverificarla antes de que se despublique automáticamente.`
      );
      porVencerPronto += 1;
    }
  }

  return { despublicadas, porVencerPronto };
}
