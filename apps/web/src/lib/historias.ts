import { ErrorStrapi, strapiGet, strapiPost } from './strapi';

// Historias del blog: testimonios anónimos que envía el público desde /blog.
//
// No hay cuentas ni login. La moderación se apoya en Draft & Publish del CMS:
// crear deja un borrador, y `strapiGet` sin parámetro `status` solo devuelve
// documentos publicados — así que todo lo que se lee acá ya pasó por la
// revisión de una persona. Ver apps/cms/src/middlewares/blog-moderacion.ts.

export const CATEGORIAS_HISTORIA = [
  { valor: 'general', etiqueta: 'General' },
  { valor: 'violencia_fisica', etiqueta: 'Violencia física' },
  { valor: 'violencia_psicologica', etiqueta: 'Violencia psicológica' },
  { valor: 'violencia_economica', etiqueta: 'Violencia económica' },
  { valor: 'violencia_digital', etiqueta: 'Violencia digital' },
  { valor: 'proceso_de_salida', etiqueta: 'Proceso de salida' },
  { valor: 'recuperacion', etiqueta: 'Recuperación' },
] as const;

export type CategoriaHistoria = (typeof CATEGORIAS_HISTORIA)[number]['valor'];

const VALORES_CATEGORIA: ReadonlySet<string> = new Set(CATEGORIAS_HISTORIA.map((c) => c.valor));

export function esCategoriaValida(valor: unknown): valor is CategoriaHistoria {
  return typeof valor === 'string' && VALORES_CATEGORIA.has(valor);
}

export function etiquetaDeCategoria(valor: string): string {
  return CATEGORIAS_HISTORIA.find((c) => c.valor === valor)?.etiqueta ?? valor.replaceAll('_', ' ');
}

export const HISTORIAS_POR_PAGINA = 10;

export type Historia = {
  id: string;
  contenido: string;
  categoria: string;
  alias: string;
  creadaEn: string;
  cantidadComentarios: number;
};

export type ComentarioHistoria = {
  id: string;
  contenido: string;
  alias: string;
  creadaEn: string;
};

export type Paginacion = {
  pagina: number;
  totalPaginas: number;
  total: number;
};

type HistoriaCruda = {
  documentId: string;
  contenido: string;
  categoria: string;
  alias: string;
  createdAt: string;
  comentarios?: { documentId: string }[] | null;
};

type ComentarioCrudo = {
  documentId: string;
  contenido: string;
  alias: string;
  createdAt: string;
};

type MetaPaginacion = {
  meta?: { pagination?: { page?: number; pageCount?: number; total?: number } };
};

// `ipHash` está marcado como privado en el schema del CMS, así que no llega
// nunca en estas respuestas: no hay nada que descartar acá a mano.
function normalizarHistoria(cruda: HistoriaCruda): Historia {
  return {
    id: cruda.documentId,
    contenido: cruda.contenido,
    categoria: cruda.categoria,
    alias: cruda.alias,
    creadaEn: cruda.createdAt,
    // Si el populate no viniera, se muestra 0 en lugar de romper la página: es
    // un dato decorativo y una historia sin contador se sigue pudiendo leer.
    cantidadComentarios: (cruda.comentarios ?? []).length,
  };
}

function normalizarComentario(crudo: ComentarioCrudo): ComentarioHistoria {
  return {
    id: crudo.documentId,
    contenido: crudo.contenido,
    alias: crudo.alias,
    creadaEn: crudo.createdAt,
  };
}

// strictParams está activo en el CMS (apps/cms/config/api.ts): cualquier
// parámetro fuera de filters/populate/sort/pagination hace fallar el pedido.
// Se pide solo el id de los comentarios porque lo único que se usa es cuántos son.
const POPULATE_CONTEO = 'populate[comentarios][fields][0]=documentId';

export async function listarHistorias(
  pagina = 1,
  categoria?: string
): Promise<{ historias: Historia[]; paginacion: Paginacion }> {
  const paginaPedida = Number.isFinite(pagina) && pagina > 0 ? Math.floor(pagina) : 1;

  const params = new URLSearchParams();
  params.set('sort[0]', 'createdAt:desc');
  params.set('pagination[page]', String(paginaPedida));
  params.set('pagination[pageSize]', String(HISTORIAS_POR_PAGINA));

  if (categoria && esCategoriaValida(categoria)) {
    params.set('filters[categoria][$eq]', categoria);
  }

  const respuesta = await strapiGet<{ data: HistoriaCruda[] } & MetaPaginacion>(
    `/api/historias?${params.toString()}&${POPULATE_CONTEO}`
  );

  const paginacionCms = respuesta.meta?.pagination;

  return {
    historias: respuesta.data.map(normalizarHistoria),
    paginacion: {
      pagina: paginacionCms?.page ?? paginaPedida,
      totalPaginas: paginacionCms?.pageCount ?? 1,
      total: paginacionCms?.total ?? respuesta.data.length,
    },
  };
}

/**
 * Devuelve null cuando la historia no existe o todavía no fue aprobada: para
 * quien visita el sitio son el mismo caso, y no se distingue a propósito.
 */
export async function obtenerHistoriaPorId(id: string): Promise<Historia | null> {
  try {
    const respuesta = await strapiGet<{ data: HistoriaCruda | null }>(`/api/historias/${id}?${POPULATE_CONTEO}`);
    return respuesta.data ? normalizarHistoria(respuesta.data) : null;
  } catch (error) {
    if (error instanceof ErrorStrapi && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }
}

export async function listarComentarios(historiaId: string): Promise<ComentarioHistoria[]> {
  const params = new URLSearchParams();
  params.set('filters[historia][documentId][$eq]', historiaId);
  params.set('sort[0]', 'createdAt:asc');
  params.set('pagination[pageSize]', '100');

  const respuesta = await strapiGet<{ data: ComentarioCrudo[] }>(`/api/comentarios-historia?${params.toString()}`);
  return respuesta.data.map(normalizarComentario);
}

export type DatosNuevaHistoria = {
  contenido: string;
  categoria: CategoriaHistoria;
  alias: string;
  ipHash?: string;
};

export type DatosNuevoComentario = {
  contenido: string;
  historiaId: string;
  alias: string;
  ipHash?: string;
};

/** Crea la historia como borrador pendiente de moderación (lo garantiza el CMS). */
export async function crearHistoria(datos: DatosNuevaHistoria): Promise<{ alias: string }> {
  await strapiPost<{ data: { documentId: string } }>('/api/historias', {
    contenido: datos.contenido,
    categoria: datos.categoria,
    alias: datos.alias,
    ipHash: datos.ipHash,
  });

  // No se devuelve el id: la historia todavía no es visible, así que no hay
  // ninguna URL a la que se pueda mandar a quien acaba de publicar.
  return { alias: datos.alias };
}

/** Crea el mensaje de apoyo como borrador pendiente de moderación. */
export async function crearComentario(datos: DatosNuevoComentario): Promise<{ alias: string }> {
  await strapiPost<{ data: { documentId: string } }>('/api/comentarios-historia', {
    contenido: datos.contenido,
    historia: datos.historiaId,
    alias: datos.alias,
    ipHash: datos.ipHash,
  });

  return { alias: datos.alias };
}
