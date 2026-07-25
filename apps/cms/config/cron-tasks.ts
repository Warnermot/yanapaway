import type { Core } from '@strapi/strapi';
import { despublicarInstitucionesVencidas } from '../src/cron/despublicar-vencidas';

export default {
  // Todos los días a las 05:00. Ver src/cron/despublicar-vencidas.ts para
  // el motivo: la regla de los 180 días también aplica a instituciones que
  // ya estaban publicadas y vencieron con el tiempo, sin que nadie vuelva
  // a tocar el registro.
  despublicarInstitucionesVencidas: {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      await despublicarInstitucionesVencidas({ strapi });
    },
    options: {
      rule: '0 0 5 * * *',
    },
  },
};
