import { ErrorStrapi, strapiGet } from './strapi';
import { urlAbsolutaDeMedia } from './media';

// Páginas de recursos del CMS. Cada Página se publica en /recursos/{slug}:
// la categoría solo agrupa las tarjetas del listado y NO forma parte de la
// URL (ver docs/api-contract.md y el schema de apps/cms).

export type CategoriaRecurso = {
  id: string;
  slug: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  orden: number;
};

export type PaginaRecurso = {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  contenido: unknown[];
  portadaUrl?: string;
  portadaAlt?: string;
  nivelSensibilidad: 'general' | 'sensible';
  orden?: number;
  categoria?: Pick<CategoriaRecurso, 'slug' | 'nombre' | 'icono'>;
};

type CategoriaStrapiCruda = {
  documentId: string;
  slug: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  orden: number;
};

type PaginaStrapiCruda = {
  documentId: string;
  slug: string;
  titulo: string;
  resumen: string;
  contenido?: unknown[] | null;
  nivelSensibilidad: 'general' | 'sensible';
  orden?: number | null;
  portada?: { url: string; alternativeText?: string | null } | null;
  categoria?: { slug: string; nombre: string; icono?: string | null } | null;
};

function normalizarCategoria(cruda: CategoriaStrapiCruda): CategoriaRecurso {
  return {
    id: cruda.documentId,
    slug: cruda.slug,
    nombre: cruda.nombre,
    descripcion: cruda.descripcion ?? undefined,
    icono: cruda.icono ?? undefined,
    orden: cruda.orden,
  };
}

function normalizarPagina(cruda: PaginaStrapiCruda): PaginaRecurso {
  return {
    id: cruda.documentId,
    slug: cruda.slug,
    titulo: cruda.titulo,
    resumen: cruda.resumen,
    contenido: cruda.contenido ?? [],
    portadaUrl: cruda.portada ? urlAbsolutaDeMedia(cruda.portada.url) : undefined,
    portadaAlt: cruda.portada?.alternativeText ?? undefined,
    nivelSensibilidad: cruda.nivelSensibilidad,
    orden: cruda.orden ?? undefined,
    categoria: cruda.categoria
      ? {
          slug: cruda.categoria.slug,
          nombre: cruda.categoria.nombre,
          icono: cruda.categoria.icono ?? undefined,
        }
      : undefined,
  };
}

// strictParams está activo en el CMS (apps/cms/config/api.ts): cualquier
// parámetro fuera de filters/populate/sort/pagination hace fallar el pedido.
const POPULATE = 'populate[categoria]=true&populate[portada]=true';

export async function listarPaginasRecursos(): Promise<PaginaRecurso[]> {
  const respuesta = await strapiGet<{ data: PaginaStrapiCruda[] }>(
    `/api/paginas?${POPULATE}&sort[0]=orden:asc&sort[1]=titulo:asc&pagination[pageSize]=100`,
  );
  return respuesta.data.map(normalizarPagina);
}

export async function obtenerPaginaRecursoPorSlug(slug: string): Promise<PaginaRecurso | null> {
  const params = new URLSearchParams();
  params.set('filters[slug][$eq]', slug);

  try {
    const respuesta = await strapiGet<{ data: PaginaStrapiCruda[] }>(`/api/paginas?${params.toString()}&${POPULATE}`);
    const cruda = respuesta.data[0];
    return cruda ? normalizarPagina(cruda) : null;
  } catch (error) {
    if (error instanceof ErrorStrapi && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function listarCategoriasRecurso(): Promise<CategoriaRecurso[]> {
  const respuesta = await strapiGet<{ data: CategoriaStrapiCruda[] }>(
    '/api/categorias-recurso?sort[0]=orden:asc&pagination[pageSize]=100',
  );
  return respuesta.data.map(normalizarCategoria);
}

export type GrupoRecursos = {
  categoria?: Pick<CategoriaRecurso, 'slug' | 'nombre' | 'descripcion' | 'icono'>;
  paginas: PaginaRecurso[];
};

/**
 * Agrupa las páginas por categoría respetando el `orden` de las categorías.
 * Las categorías sin páginas publicadas se omiten. Las páginas cuya categoría
 * no aparece en el listado (o que no tienen categoría) caen en un grupo final
 * sin encabezado, para que nunca desaparezcan del sitio por un dato incompleto.
 */
export function agruparPorCategoria(paginas: PaginaRecurso[], categorias: CategoriaRecurso[]): GrupoRecursos[] {
  const grupos: GrupoRecursos[] = [];

  for (const categoria of [...categorias].sort((a, b) => a.orden - b.orden)) {
    const delGrupo = paginas.filter((pagina) => pagina.categoria?.slug === categoria.slug);
    if (delGrupo.length > 0) {
      grupos.push({ categoria, paginas: delGrupo });
    }
  }

  const slugsConocidos = new Set(categorias.map((categoria) => categoria.slug));
  const sinCategoria = paginas.filter((pagina) => !pagina.categoria || !slugsConocidos.has(pagina.categoria.slug));
  if (sinCategoria.length > 0) {
    grupos.push({ paginas: sinCategoria });
  }

  return grupos;
}
