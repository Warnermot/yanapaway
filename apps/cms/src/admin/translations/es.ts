/**
 * Sobrescrituras del paquete de traducción `es` que ya trae Strapi.
 *
 * Strapi 5.51 incluye un `es.json` completo, así que acá solo se corrigen
 * dos cosas:
 *
 *  1. Referencias a "Strapi" en pantallas que ven los gestores de contenido.
 *     Para ellos la herramienta es "Yanapaway", no un producto de terceros.
 *  2. Cadenas del bundle oficial que mezclan tuteo y "usted" o que arrancan
 *     sin signo de apertura ("Bienvenido!"). Se unifica todo en un español
 *     neutro e impersonal, sin regionalismos.
 *
 * Las claves restantes caen al `es.json` de Strapi, y las que falten ahí caen
 * a `en` (fallback obligatorio del panel).
 *
 * Claves disponibles:
 * https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/translations
 */
export const es = {
  // ── Pantallas de autenticación (login, recuperar contraseña, registro) ──
  'Auth.form.welcome.title': 'Hola de nuevo',
  'Auth.form.welcome.subtitle': 'Inicia sesión para gestionar el contenido del sitio.',
  'Auth.form.button.login.strapi': 'Iniciar sesión',
  'Auth.form.register.subtitle':
    'Estas credenciales solo sirven para entrar al panel de administración. Los datos se guardan en la base de datos del proyecto.',

  // ── Navegación y cabecera ──
  'app.components.LeftMenu.navbrand.title': 'Yanapaway',
  'app.components.LeftMenu.navbrand.workplace': 'Panel de contenido',

  // ── Página de inicio ──
  // Sin marca de género: quien administra puede ser cualquier persona.
  'app.components.HomePage.welcome': 'Te damos la bienvenida',
  'app.components.HomePage.welcome.again': 'Hola de nuevo',
  'app.components.HomePage.welcomeBlock.content.again':
    'Desde acá se gestionan las páginas, las secciones y las instituciones de contacto del sitio.',
  'HomePage.welcome.congrats.content':
    'Esta cuenta es la de administración principal del proyecto.',

  // ── Ajustes ──
  'Settings.application.strapi-version': 'Versión del sistema',
  'Settings.application.strapiVersion': 'Versión del sistema',
  'Settings.permissions.users.listview.header.subtitle':
    'Personas con acceso al panel de administración',
};
