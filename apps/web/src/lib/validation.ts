// Strapi 5 identifica cada entrada por su `documentId`: una cadena
// alfanumérica (no un UUID). No hay un formato exacto documentado como
// contrato público, así que esto solo evita valores claramente inválidos
// (vacíos, con caracteres que no tienen sentido en un identificador) antes
// de usarlos en una consulta a la API de Strapi.
const DOCUMENT_ID_RE = /^[a-z0-9]{1,40}$/i;

export function esIdValido(valor: string): boolean {
  return DOCUMENT_ID_RE.test(valor);
}
