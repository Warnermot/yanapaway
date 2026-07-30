import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detenerCmsDePrueba, iniciarCmsDePrueba, type ServidorCmsPrueba } from '../test-utils/servidor-cms-prueba';
// Solo tipos: lib/strapi.ts lee STRAPI_URL/STRAPI_API_TOKEN una única vez al
// importarse, así que el módulo real se carga dinámicamente DESPUÉS de que el
// harness fija esas variables (ver test-utils/servidor-cms-prueba.ts).
import type { CategoriaRecurso, PaginaRecurso } from './recursos';

let servidor: ServidorCmsPrueba;

// Contra un Strapi real: así queda cubierto también que el token de
// integración tenga permiso de lectura sobre paginas y categorias-recurso
// (ver apps/cms/src/bootstrap/token-integracion-web.ts). Un 403 acá es un
// fallo legítimo, no ruido del entorno.
describe('lib/recursos contra el CMS real', () => {
  beforeAll(async () => {
    servidor = await iniciarCmsDePrueba();

    const educativos = await servidor.strapi.documents('api::categoria-recurso.categoria-recurso').create({
      data: { nombre: 'Contenidos educativos', slug: 'contenidos-educativos', orden: 1 },
    });
    const estadisticas = await servidor.strapi.documents('api::categoria-recurso.categoria-recurso').create({
      data: { nombre: 'Datos estadísticos', slug: 'datos-estadisticos', orden: 2 },
    });

    await servidor.strapi.documents('api::pagina.pagina').create({
      data: {
        titulo: '¿Qué es la violencia psicológica?',
        slug: 'que-es-violencia-psicologica',
        resumen: 'Cómo se reconoce y por qué no es normal.',
        contenido: [{ type: 'paragraph', children: [{ type: 'text', text: 'Un párrafo.' }] }],
        categoria: educativos.documentId,
        nivelSensibilidad: 'sensible',
        orden: 1,
      },
      status: 'published',
    });

    await servidor.strapi.documents('api::pagina.pagina').create({
      data: {
        titulo: 'Estadísticas de violencia 2026',
        slug: 'estadisticas-violencia-2026',
        resumen: 'Cifras oficiales del año.',
        categoria: estadisticas.documentId,
        nivelSensibilidad: 'general',
        orden: 1,
      },
      status: 'published',
    });

    // Borrador: no debe aparecer en el sitio.
    await servidor.strapi.documents('api::pagina.pagina').create({
      data: {
        titulo: 'Borrador sin publicar',
        slug: 'borrador-sin-publicar',
        resumen: 'No debería listarse.',
        categoria: educativos.documentId,
        nivelSensibilidad: 'general',
      },
    });
  }, 120_000);

  afterAll(async () => {
    await detenerCmsDePrueba(servidor);
  });

  it('lista solo las páginas publicadas, normalizadas al tipo del sitio', async () => {
    const { listarPaginasRecursos } = await import('./recursos');

    const paginas = await listarPaginasRecursos();
    const slugs = paginas.map((pagina) => pagina.slug);

    expect(slugs).toContain('que-es-violencia-psicologica');
    expect(slugs).toContain('estadisticas-violencia-2026');
    expect(slugs).not.toContain('borrador-sin-publicar');

    const pagina = paginas.find((candidata) => candidata.slug === 'que-es-violencia-psicologica');
    expect(pagina?.id).toMatch(/\w/);
    expect(pagina?.titulo).toBe('¿Qué es la violencia psicológica?');
    expect(pagina?.nivelSensibilidad).toBe('sensible');
    expect(pagina?.categoria).toEqual({ slug: 'contenidos-educativos', nombre: 'Contenidos educativos', icono: undefined });
    expect(pagina?.contenido).toHaveLength(1);
    expect(pagina?.portadaUrl).toBeUndefined();
  });

  it('lista las categorías ordenadas por orden', async () => {
    const { listarCategoriasRecurso } = await import('./recursos');

    const categorias = await listarCategoriasRecurso();

    expect(categorias.map((categoria) => categoria.slug)).toEqual(['contenidos-educativos', 'datos-estadisticos']);
    expect(categorias[0].id).toMatch(/\w/);
  });

  it('encuentra una página publicada por su slug', async () => {
    const { obtenerPaginaRecursoPorSlug } = await import('./recursos');

    const pagina = await obtenerPaginaRecursoPorSlug('que-es-violencia-psicologica');

    expect(pagina?.titulo).toBe('¿Qué es la violencia psicológica?');
  });

  it('devuelve null para un slug inexistente y para un borrador', async () => {
    const { obtenerPaginaRecursoPorSlug } = await import('./recursos');

    expect(await obtenerPaginaRecursoPorSlug('no-existe')).toBeNull();
    expect(await obtenerPaginaRecursoPorSlug('borrador-sin-publicar')).toBeNull();
  });
});

describe('agruparPorCategoria', () => {
  const categorias: CategoriaRecurso[] = [
    { id: 'c2', slug: 'estadisticas', nombre: 'Estadísticas', orden: 2 },
    { id: 'c1', slug: 'educativos', nombre: 'Educativos', orden: 1 },
  ];

  function pagina(slug: string, categoriaSlug?: string): PaginaRecurso {
    return {
      id: slug,
      slug,
      titulo: slug,
      resumen: '',
      contenido: [],
      nivelSensibilidad: 'general',
      categoria: categoriaSlug ? { slug: categoriaSlug, nombre: categoriaSlug } : undefined,
    };
  }

  it('respeta el orden de las categorías y omite las vacías', async () => {
    const { agruparPorCategoria } = await import('./recursos');

    const grupos = agruparPorCategoria([pagina('a', 'estadisticas'), pagina('b', 'educativos')], [
      ...categorias,
      { id: 'c3', slug: 'legales', nombre: 'Legales', orden: 3 },
    ]);

    expect(grupos.map((grupo) => grupo.categoria?.slug)).toEqual(['educativos', 'estadisticas']);
    expect(grupos[0].paginas.map((p) => p.slug)).toEqual(['b']);
  });

  it('no pierde páginas sin categoría o con una categoría desconocida', async () => {
    const { agruparPorCategoria } = await import('./recursos');

    const grupos = agruparPorCategoria([pagina('a', 'educativos'), pagina('b'), pagina('c', 'fantasma')], categorias);

    const ultimo = grupos[grupos.length - 1];
    expect(ultimo.categoria).toBeUndefined();
    expect(ultimo.paginas.map((p) => p.slug)).toEqual(['b', 'c']);
  });
});
