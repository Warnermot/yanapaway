import type { StrapiApp } from '@strapi/strapi/admin';

import { theme } from './theme';
import { es } from './translations/es';

/**
 * Clave de localStorage que usa el panel para recordar el idioma elegido.
 * Verificada contra @strapi/admin 5.51 (`LANGUAGE_LOCAL_STORAGE_KEY`).
 */
const CLAVE_IDIOMA = 'strapi-admin-language';
const IDIOMA_POR_DEFECTO = 'es';

/**
 * Panel de administración en español: es la única interfaz del sistema y la
 * usan gestores de contenido sin formación técnica. El objetivo de
 * aceptación del brief ("crear y publicar una página en menos de 10 minutos
 * tras una inducción breve") depende directamente de esto.
 *
 * `locales` solo habilita el idioma en el selector; Strapi guarda la
 * preferencia por usuario y arranca en inglés mientras no haya una elegida.
 * Por eso `bootstrap()` siembra el español la primera vez: así la pantalla de
 * login —que se ve antes de tener cuenta y perfil— ya sale traducida. Después
 * cada persona puede cambiarlo desde su perfil y esa elección se respeta.
 */
export default {
  config: {
    locales: [IDIOMA_POR_DEFECTO],
    translations: { es },
    theme,
    // El panel es una herramienta interna del proyecto, no un entorno de
    // aprendizaje de Strapi: los tutoriales y los avisos de nuevas versiones
    // solo distraen a quien viene a cargar una institución de contacto.
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap(app: StrapiApp) {
    void app;

    // Solo siembra el idioma; nunca pisa una preferencia ya guardada.
    try {
      if (!window.localStorage.getItem(CLAVE_IDIOMA)) {
        window.localStorage.setItem(CLAVE_IDIOMA, IDIOMA_POR_DEFECTO);
      }
    } catch {
      // Navegador con almacenamiento bloqueado: el panel cae a inglés y sigue
      // siendo usable. No vale la pena romper el arranque por esto.
    }
  },
};
