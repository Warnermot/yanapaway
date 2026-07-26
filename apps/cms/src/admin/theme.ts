/**
 * Tema del panel de administración, derivado de la paleta oficial del
 * proyecto (`apps/web/src/styles/global.css`, a su vez tomada de
 * `guia-paleta-colores.md`).
 *
 * Por qué no se importa `global.css` directamente: el panel de Strapi es una
 * SPA de React con su propio design system, y colorea todo a partir de tokens
 * con nombre (`primary600`, `neutral0`, …), no de variables CSS del proyecto.
 * Además, `global.css` trae un reset (`body { margin: 0 }`, `ul { list-style:
 * none }`, `h1..p { margin: 0 }`) que rompería el layout del panel. Por eso
 * acá se replican los valores de la paleta mapeados a los tokens del design
 * system, y `global.css` queda como fuente de verdad documental.
 *
 * Tokens de referencia:
 * https://github.com/strapi/design-system/blob/main/packages/design-system/src/themes/lightTheme/light-colors.ts
 *
 * ── Nota de contraste ────────────────────────────────────────────────────
 * El azul dominante de la paleta (#3eb6fc) es demasiado claro para cargar
 * texto o controles sobre blanco: da 1.9:1 contra blanco, por debajo del
 * 4.5:1 (texto) y del 3:1 (componentes de UI) que pide WCAG AA. Por eso en el
 * tema claro los tokens que sostienen texto y botones usan versiones más
 * profundas del mismo tono (H≈202°), y el color de marca tal cual aparece
 * donde sí funciona: como color de texto/acento sobre el fondo oscuro.
 *
 * Los colores semánticos (success / warning / danger) se dejan en el default
 * de Strapi a propósito. En este CMS un aviso de "institución por vencer" o
 * un error de la regla de 180 días tiene que leerse como aviso o como error
 * al instante; teñirlos con la paleta de marca los volvería ambiguos.
 */

/** Azul dominante de la paleta. Ancla del tema oscuro y de los tintes. */
const AZUL_MARCA = '#3eb6fc'; // --color-primary
/** Variante clara de la paleta. */
const AZUL_CLARO = '#6bc8fd'; // --color-primary-light
/** Variante oscura de la paleta. ~9:1 contra blanco. */
const AZUL_OSCURO = '#0c4a6b'; // --color-primary-dark

/** Derivados del mismo tono (H≈202°) para cumplir contraste AA. */
const AZUL_ACCION = '#0a78b8'; // 4.8:1 contra blanco — botones, enlaces, nav activa
const AZUL_ACENTO = '#098fdc'; // 3.5:1 contra blanco — foco, bordes de acento
const AZUL_TINTE = '#e7f6fe'; // fondo muy suave
const AZUL_PROFUNDO = '#0a2e42'; // superficie tintada para el tema oscuro

/** Coral/naranja de la paleta, para acentos no semánticos (etiquetas, chips). */
const CORAL_TINTE = '#fff1ec';
const CORAL_BORDE = '#fdcbb8';
const CORAL_ACENTO = '#bb481b'; // 5.2:1 contra blanco
const CORAL_ACCION = '#9f3b14';
const CORAL_PROFUNDO = '#7d2c0d';

/**
 * El texto de los botones primarios es blanco (`buttonNeutral0: #ffffff`) en
 * ambos temas, así que estos dos valores tienen que cumplir 4.5:1 contra
 * blanco en claro y en oscuro por igual.
 */
const BOTON_FONDO = AZUL_ACCION;
const BOTON_FONDO_HOVER = AZUL_OSCURO;

export const theme = {
  light: {
    colors: {
      primary100: AZUL_TINTE,
      primary200: AZUL_CLARO,
      primary500: AZUL_ACENTO,
      primary600: AZUL_ACCION,
      primary700: AZUL_OSCURO,

      buttonPrimary500: BOTON_FONDO,
      buttonPrimary600: BOTON_FONDO_HOVER,

      alternative100: CORAL_TINTE,
      alternative200: CORAL_BORDE,
      alternative500: CORAL_ACENTO,
      alternative600: CORAL_ACCION,
      alternative700: CORAL_PROFUNDO,
    },
  },
  dark: {
    colors: {
      // Sobre fondo oscuro el azul de marca sí rinde: 6.9:1 contra #212134.
      primary100: AZUL_PROFUNDO,
      primary200: AZUL_OSCURO,
      primary500: AZUL_ACENTO,
      primary600: AZUL_MARCA,
      primary700: AZUL_CLARO,

      buttonPrimary500: BOTON_FONDO,
      buttonPrimary600: BOTON_FONDO_HOVER,

      alternative100: '#3a1a0c',
      alternative200: CORAL_PROFUNDO,
      alternative500: '#e0703f',
      alternative600: '#fc936a',
      alternative700: '#fdb192',
    },
  },
};
