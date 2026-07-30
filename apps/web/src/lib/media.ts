// El CMS devuelve URLs de media relativas cuando el proveedor de upload es el
// local. Hay que absolutizarlas contra el host público del CMS para que el
// navegador las pueda cargar desde el sitio.
const CMS_URL_PUBLICA = (process.env.PUBLIC_CMS_URL ?? process.env.STRAPI_URL ?? 'http://localhost:1337').replace(
  /\/+$/,
  '',
);

export function urlAbsolutaDeMedia(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${CMS_URL_PUBLICA}${url}`;
}
