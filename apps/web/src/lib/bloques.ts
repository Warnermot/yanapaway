// Tipos y saneado del campo `contenido` de Página (editor de bloques de
// Strapi). El CMS es la fuente de verdad del formato, pero el sitio no debe
// romperse si aparece un tipo de nodo que todavía no sabe renderizar: los
// nodos desconocidos se descartan en vez de tirar la página abajo.

export type NodoTexto = {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

export type NodoEnlace = {
  type: 'link';
  url: string;
  children: NodoTexto[];
};

export type NodoInline = NodoTexto | NodoEnlace;

export type NodoItemLista = {
  type: 'list-item';
  children: Array<NodoInline | NodoLista>;
};

export type NodoLista = {
  type: 'list';
  format: 'ordered' | 'unordered';
  children: NodoItemLista[];
};

export type NodoParrafo = { type: 'paragraph'; children: NodoInline[] };
export type NodoTitulo = { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: NodoInline[] };
export type NodoCita = { type: 'quote'; children: NodoInline[] };
export type NodoCodigo = { type: 'code'; children: NodoTexto[] };
export type NodoImagen = {
  type: 'image';
  image: { url: string; alternativeText?: string | null; width?: number; height?: number };
};

export type BloqueRaiz = NodoParrafo | NodoTitulo | NodoLista | NodoCita | NodoCodigo | NodoImagen;

const TIPOS_RAIZ_SOPORTADOS = new Set(['paragraph', 'heading', 'list', 'quote', 'code', 'image']);
const TIPOS_INLINE_SOPORTADOS = new Set(['text', 'link']);

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function esNodoInline(valor: unknown): valor is NodoInline {
  if (!esObjeto(valor) || typeof valor.type !== 'string') return false;
  if (!TIPOS_INLINE_SOPORTADOS.has(valor.type)) return false;
  if (valor.type === 'text') return typeof valor.text === 'string';
  return typeof valor.url === 'string';
}

/** Separa los nodos inline de un contenedor y descarta lo que no sepamos pintar. */
export function inlineDe(nodo: { children?: unknown }): NodoInline[] {
  return Array.isArray(nodo.children) ? nodo.children.filter(esNodoInline) : [];
}

/** Sublistas anidadas dentro de un ítem de lista (el editor las permite). */
export function listasAnidadasDe(item: NodoItemLista): NodoLista[] {
  return (item.children ?? []).filter((hijo): hijo is NodoLista => esObjeto(hijo) && hijo.type === 'list');
}

/** Texto plano de un bloque de código: el editor lo guarda como nodos de texto. */
export function textoDe(nodo: { children?: unknown }): string {
  return inlineDe(nodo)
    .map((hijo) => (hijo.type === 'text' ? hijo.text : hijo.children.map((texto) => texto.text).join('')))
    .join('');
}

/**
 * Filtra el contenido crudo del CMS y deja solo los bloques raíz que el sitio
 * sabe renderizar. Nunca lanza: si el valor no es un arreglo, devuelve vacío.
 */
export function normalizarBloques(valor: unknown): BloqueRaiz[] {
  if (!Array.isArray(valor)) return [];

  return valor.filter((nodo): nodo is BloqueRaiz => {
    if (!esObjeto(nodo) || typeof nodo.type !== 'string') return false;
    if (!TIPOS_RAIZ_SOPORTADOS.has(nodo.type)) return false;
    if (nodo.type === 'image') return esObjeto(nodo.image) && typeof nodo.image.url === 'string';
    if (nodo.type === 'list') return Array.isArray(nodo.children);
    return true;
  });
}

/**
 * Nivel de encabezado seguro. El h1 de la página es su título, así que un
 * encabezado del editor nunca puede subir más allá de h2.
 */
export function etiquetaTitulo(level: number): 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  const nivel = Math.min(6, Math.max(2, Math.round(level) || 2));
  return `h${nivel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
