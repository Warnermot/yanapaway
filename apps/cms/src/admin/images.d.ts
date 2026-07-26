/**
 * Declaraciones para importar imágenes desde el código del panel.
 *
 * El bundler del panel (Vite) resuelve estos imports a una URL, pero
 * TypeScript no lo sabe por su cuenta y Strapi no publica estos tipos.
 */
declare module '*.png' {
  const url: string;
  export default url;
}

declare module '*.svg' {
  const url: string;
  export default url;
}
