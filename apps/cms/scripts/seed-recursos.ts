/**
 * Carga las categorías de recurso y la primera página real de /recursos.
 *
 * A diferencia de scripts/seed.ts (datos ficticios de desarrollo), acá el
 * contenido es real y publicable: sirve para verificar el circuito completo
 * CMS → sitio y queda como punto de partida editable desde el panel.
 *
 * Idempotente: revisa por slug antes de crear, así que se puede correr varias
 * veces sin duplicar. NO sobrescribe ediciones hechas en el panel.
 *
 * Uso: pnpm --filter cms seed:recursos
 */
import { createStrapi, compileStrapi } from '@strapi/strapi';
import type { Modules } from '@strapi/strapi';

const CATEGORIA_UID = 'api::categoria-recurso.categoria-recurso';
const PAGINA_UID = 'api::pagina.pagina';

/** Árbol de bloques que acepta el campo `contenido` de Página. */
type BloquesContenido = NonNullable<Modules.Documents.Params.Data.Input<'api::pagina.pagina'>['contenido']>;
type BloqueRaiz = BloquesContenido[number];

type CategoriaSeed = {
  nombre: string;
  slug: string;
  descripcion: string;
  orden: number;
};

const CATEGORIAS: CategoriaSeed[] = [
  {
    nombre: 'Contenidos educativos',
    slug: 'contenidos-educativos',
    descripcion: 'Material para entender qué es la violencia, cómo se reconoce y qué hacer frente a ella.',
    orden: 1,
  },
  {
    nombre: 'Datos estadísticos',
    slug: 'datos-estadisticos',
    descripcion: 'Cifras y reportes sobre violencia de género en Bolivia y en Chuquisaca.',
    orden: 2,
  },
  {
    nombre: 'Aspectos legales',
    slug: 'aspectos-legales',
    descripcion: 'Derechos, denuncias y rutas de protección según la normativa boliviana.',
    orden: 3,
  },
];

// El campo `contenido` es de tipo blocks: se arma como el árbol de nodos que
// produce el editor del panel. Nunca HTML (ver la descripción del atributo en
// el schema de Página).
const PARRAFO = (texto: string): BloqueRaiz => ({
  type: 'paragraph',
  children: [{ type: 'text', text: texto }],
});

const TITULO = (texto: string): BloqueRaiz => ({
  type: 'heading',
  level: 2,
  children: [{ type: 'text', text: texto }],
});

const LISTA = (items: string[]): BloqueRaiz => ({
  type: 'list',
  format: 'unordered',
  children: items.map((item) => ({
    type: 'list-item',
    children: [{ type: 'text', text: item }],
  })),
});

type PaginaSeed = {
  titulo: string;
  slug: string;
  resumen: string;
  categoriaSlug: string;
  nivelSensibilidad: 'general' | 'sensible';
  orden: number;
  contenido: BloquesContenido;
};

const PAGINAS: PaginaSeed[] = [
  {
    titulo: '¿Qué es la violencia psicológica?',
    slug: 'que-es-violencia-psicologica',
    resumen:
      'La violencia psicológica no deja marcas visibles, pero sí consecuencias reales. Aquí explicamos cómo se reconoce y por qué no es "algo normal" de una relación.',
    categoriaSlug: 'contenidos-educativos',
    nivelSensibilidad: 'sensible',
    orden: 1,
    contenido: [
      PARRAFO(
        'La violencia psicológica es toda conducta que busca controlar, humillar, aislar o asustar a otra persona. No deja marcas visibles, y por eso muchas veces se minimiza o se confunde con celos, con preocupación o con "el carácter" de alguien. Pero tiene consecuencias reales y sostenidas en la salud emocional de quien la recibe.'
      ),
      TITULO('Cómo se reconoce'),
      PARRAFO(
        'No es un episodio aislado de enojo: es un patrón que se repite y que suele volverse más frecuente con el tiempo. Algunas señales habituales:'
      ),
      LISTA([
        'Te descalifica o se burla de ti, en privado o delante de otras personas.',
        'Revisa tu teléfono, tus redes o tus mensajes, y decide con quién puedes hablar.',
        'Te culpa de sus reacciones: "yo me pongo así por lo que tú haces".',
        'Te aísla de tu familia o de tus amistades.',
        'Amenaza con dejarte, con contar algo tuyo o con lastimarse.',
        'Alterna momentos de agresión con momentos de arrepentimiento y promesas.',
      ]),
      TITULO('No es tu culpa'),
      PARRAFO(
        'Nadie provoca que otra persona la maltrate. La responsabilidad de la violencia es siempre de quien la ejerce. Si al leer esto reconoces tu propia situación, no estás exagerando y no estás sola.'
      ),
      TITULO('Dónde pedir ayuda'),
      PARRAFO(
        'En el directorio de este sitio puedes encontrar instituciones en tu ciudad que atienden estos casos de forma gratuita y confidencial: defensorías, la FELCV, servicios legales integrales municipales y centros de apoyo psicológico. También puedes consultar el asistente si prefieres empezar por escribir lo que te pasa.'
      ),
    ],
  },
];

async function main(): Promise<void> {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const categorias: Record<string, string> = {};

    for (const def of CATEGORIAS) {
      const existente = await app.documents(CATEGORIA_UID).findFirst({ filters: { slug: def.slug } });
      const doc = existente ?? (await app.documents(CATEGORIA_UID).create({ data: def }));
      categorias[def.slug] = doc.documentId;
      app.log.info(`[seed:recursos] Categoría "${def.nombre}": ${existente ? 'ya existía' : 'creada'}.`);
    }

    for (const def of PAGINAS) {
      const existente = await app.documents(PAGINA_UID).findFirst({ filters: { slug: def.slug } });
      if (existente) {
        app.log.info(`[seed:recursos] Página "/recursos/${def.slug}": ya existía, no se toca.`);
        continue;
      }

      const { categoriaSlug, ...datos } = def;
      await app.documents(PAGINA_UID).create({
        data: { ...datos, categoria: categorias[categoriaSlug] },
        status: 'published',
      });
      app.log.info(`[seed:recursos] Página "/recursos/${def.slug}": creada y publicada.`);
    }
  } finally {
    await app.destroy();
  }

  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[seed:recursos] Falló la carga de recursos:', error);
  process.exit(1);
});
