import type { StrapiApp } from '@strapi/strapi/admin';

// Panel de administración en español: es la única interfaz del sistema y la
// usan gestores de contenido sin formación técnica. El objetivo de
// aceptación del brief ("crear y publicar una página en menos de 10 minutos
// tras una inducción breve") depende directamente de esto.
//
// El tema visual queda en el default de Strapi a propósito: la paleta del
// proyecto la aplica el equipo del sitio en apps/web, no acá.
export default {
  config: {
    locales: ['es'],
  },
  bootstrap(app: StrapiApp) {
    void app;
  },
};
