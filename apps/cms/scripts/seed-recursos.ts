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
import fs from 'node:fs';
import path from 'node:path';

// Las imágenes viven en apps/web (assets de Astro); el CMS las sube a su
// propia media library una sola vez, en el primer seed.
const ASSETS_DIR = path.resolve(__dirname, '../../web/src/assets/images');

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
  /** Ruta relativa a ASSETS_DIR (p. ej. "contenido/foo.png"). Opcional. */
  portadaArchivo?: string;
  portadaAlt?: string;
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
  {
    titulo: 'El feminicidio no es un caso aislado',
    slug: 'feminicidio-no-es-caso-aislado',
    resumen:
      'El feminicidio es el punto más extremo de la violencia de género, casi nunca sin avisos previos. Por qué las marchas como "Ni una menos" importan y qué hacer antes de que sea tarde.',
    categoriaSlug: 'contenidos-educativos',
    nivelSensibilidad: 'sensible',
    orden: 2,
    portadaArchivo: 'contenido/contenido1.png',
    portadaAlt: 'Mujeres en una protesta sosteniendo un cartel que dice "Alto al feminicidio, #Ni una menos".',
    contenido: [
      PARRAFO(
        'El feminicidio es el asesinato de una mujer por el hecho de serlo, casi siempre después de un historial de violencia previa. No suele ser un hecho repentino ni imposible de anticipar: en la mayoría de los casos hubo señales, denuncias no atendidas a tiempo o ciclos de violencia que se fueron intensificando.'
      ),
      TITULO('Por qué se sale a marchar'),
      PARRAFO(
        'Consignas como "Ni una menos" no son solo un reclamo simbólico: buscan que los casos se investiguen, que las instituciones respondan a tiempo y que la sociedad deje de tratar la violencia contra las mujeres como un asunto privado. Visibilizar el problema es parte de prevenirlo.'
      ),
      TITULO('Qué hacer antes de que sea tarde'),
      PARRAFO(
        'Si identificas señales de riesgo — amenazas, aislamiento, control, agresiones que escalan — no esperes a que la situación se resuelva sola. El directorio de este sitio reúne instituciones que reciben denuncias y brindan protección; si prefieres una primera orientación antes de dar ese paso, el asistente también está disponible.'
      ),
    ],
  },
  {
    titulo: 'Acompañar a quienes perdieron a alguien por violencia',
    slug: 'acompanar-a-quienes-perdieron-a-alguien',
    resumen:
      'Cuando la violencia termina en una pérdida, la familia y la comunidad necesitan otro tipo de apoyo. Qué ayuda de verdad y qué evitar al acompañar el duelo.',
    categoriaSlug: 'contenidos-educativos',
    nivelSensibilidad: 'sensible',
    orden: 3,
    portadaArchivo: 'contenido/contendio2.png',
    portadaAlt: 'Una mujer mayor junto a una niña, sentadas frente a una tumba en un cementerio.',
    contenido: [
      PARRAFO(
        'Cuando la violencia termina en la pérdida de alguien, el dolor no se queda solo en quienes fueron víctimas directas: alcanza a madres, abuelas, hijas e hijos, y a toda una comunidad. Acompañar ese duelo requiere paciencia y cuidado, no respuestas rápidas.'
      ),
      TITULO('Qué ayuda de verdad'),
      LISTA([
        'Escuchar sin apurar el proceso ni imponer plazos para "superarlo".',
        'Ofrecer presencia concreta: acompañar a trámites, cocinar, cuidar a otros hijos o hijas.',
        'Nombrar a la persona que se perdió, si la familia lo permite: el silencio suele doler más.',
        'Respetar los tiempos y las formas de duelo de cada quien, incluidas las costumbres propias de su comunidad.',
      ]),
      TITULO('Qué evitar'),
      LISTA([
        'Frases como "ya pasó tiempo" o "todo pasa por algo".',
        'Preguntas sobre los detalles de lo ocurrido, salvo que la persona quiera hablar de eso.',
        'Dejar de acompañar una vez que pasan los primeros días: el duelo continúa mucho después.',
      ]),
      TITULO('Cuidar a quien cuida'),
      PARRAFO(
        'Acompañar un duelo así también desgasta. Buscar apoyo psicológico para quienes sostienen a la familia no es un lujo, es parte de sostener el acompañamiento en el tiempo. Las instituciones del directorio de este sitio también orientan a familiares y personas cercanas, no solo a quien vive la violencia de forma directa.'
      ),
    ],
  },
  {
    titulo: 'Reconocer la violencia física antes de que escale',
    slug: 'reconocer-violencia-fisica-antes-de-escalar',
    resumen:
      'La violencia física casi nunca aparece de un día para otro: suele seguir un patrón que se repite y se intensifica. Aprende a reconocerlo a tiempo.',
    categoriaSlug: 'contenidos-educativos',
    nivelSensibilidad: 'sensible',
    orden: 4,
    portadaArchivo: 'contenido/contra.png',
    portadaAlt: 'Un puño cerrado frente a una mano abierta en señal de alto.',
    contenido: [
      PARRAFO(
        'La violencia física rara vez es el primer paso: suele llegar después de violencia psicológica, control o amenazas que ya venían ocurriendo. Reconocer el patrón antes de que se intensifique puede marcar la diferencia.'
      ),
      TITULO('El patrón de escalada'),
      PARRAFO('Presta atención si la situación incluye alguna de estas señales:'),
      LISTA([
        'Empujones, sacudidas o "accidentes" que dejan marcas.',
        'Objetos lanzados o golpeados cerca de ti, aunque no te toquen directamente.',
        'Amenazas de daño hacia ti, hacia otras personas o hacia mascotas.',
        'Impedirte salir de un lugar, encerrarte o bloquear una puerta.',
        'Cualquier golpe, aunque después haya arrepentimiento o promesas de que no se repetirá.',
      ]),
      TITULO('Qué hacer si ya está pasando'),
      PARRAFO(
        'Si estás en peligro inmediato, usa el botón SOS de este sitio o comunícate directamente con la FELCV. Si necesitas pensar tus siguientes pasos con calma, el directorio de instituciones y el asistente están disponibles para orientarte sin presión.'
      ),
    ],
  },
  {
    titulo: 'Buscar apoyo psicológico: qué esperar de la primera consulta',
    slug: 'primera-consulta-apoyo-psicologico',
    resumen:
      'Dar el primer paso para pedir apoyo psicológico puede dar miedo. Esto es, en general, lo que suele pasar en una primera consulta.',
    categoriaSlug: 'contenidos-educativos',
    nivelSensibilidad: 'general',
    orden: 5,
    portadaArchivo: 'contactos/spicologo.png',
    portadaAlt: 'Retrato de un profesional sonriendo en un consultorio.',
    contenido: [
      PARRAFO(
        'Pedir apoyo psicológico por primera vez genera dudas normales: ¿qué le voy a decir?, ¿me va a juzgar?, ¿tengo que contarlo todo de una vez? No existe una única forma correcta de empezar, pero esto suele ser habitual.'
      ),
      TITULO('Qué suele pasar en la primera sesión'),
      PARRAFO(
        'Generalmente la persona profesional pregunta qué te trae a la consulta y escucha, sin exigir que cuentes todo de inmediato. Puedes ir a tu ritmo: no hace falta llegar con un relato ordenado ni con todos los detalles resueltos.'
      ),
      TITULO('La confidencialidad es la regla'),
      PARRAFO(
        'Lo que hables en consulta es confidencial, salvo situaciones de riesgo grave donde la ley exige actuar para protegerte a ti o a otras personas. Si tienes dudas sobre esto, es válido preguntarlo directamente en la primera cita.'
      ),
      TITULO('No tienes que tener todo claro antes de ir'),
      PARRAFO(
        'No necesitas estar segura de qué es lo que te pasa, ni tener un diagnóstico previo. El servicio legal integral municipal (SLIM) y otras instituciones del directorio ofrecen orientación psicológica gratuita como primer paso.'
      ),
    ],
  },
  {
    titulo: 'Documentar lo que estás viviendo, sin ponerte en más riesgo',
    slug: 'documentar-sin-ponerte-en-riesgo',
    resumen:
      'Guardar registros — mensajes, fechas, fotos — puede ayudar más adelante en una denuncia. Cómo hacerlo sin que ese registro te ponga en peligro.',
    categoriaSlug: 'aspectos-legales',
    nivelSensibilidad: 'sensible',
    orden: 1,
    portadaArchivo: 'contactos/foto.png',
    portadaAlt: 'Una mujer trabajando en su laptop.',
    contenido: [
      PARRAFO(
        'Tener un registro de lo que ha ocurrido —fechas, mensajes, fotos de lesiones o daños— puede ser útil si en algún momento decides hacer una denuncia. No es obligatorio hacerlo, y nunca debe ponerte en más riesgo del que ya estás.'
      ),
      TITULO('Qué conviene guardar'),
      LISTA([
        'Capturas de pantalla de mensajes o llamadas con fecha visible.',
        'Fotos de lesiones o daños materiales, con fecha.',
        'Un registro simple con fecha, hora y qué ocurrió, aunque sea breve.',
        'Nombres de testigos, si los hay y si es seguro mencionarlos.',
      ]),
      TITULO('Cómo guardarlo de forma segura'),
      LISTA([
        'En un correo electrónico o nube a la que solo tú tengas acceso, no en el celular compartido.',
        'Con una persona de confianza que pueda guardarlo por ti, si tu dispositivo no es seguro.',
        'Evita guardar el registro donde la persona agresora pueda encontrarlo o borrarlo.',
      ]),
      TITULO('Esto no es obligatorio'),
      PARRAFO(
        'No tener pruebas guardadas no invalida lo que estás viviendo, y no es un requisito para pedir ayuda. La Fiscalía y la FELCV pueden orientarte sobre qué necesitan en tu caso concreto, sin que tengas que resolverlo todo por tu cuenta primero.'
      ),
    ],
  },
];

const MIME_POR_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Sube un archivo local a la media library de Strapi y devuelve su id. */
async function subirImagen(
  app: Awaited<ReturnType<typeof createStrapi>>,
  rutaRelativa: string,
  alternativeText: string,
): Promise<number> {
  const rutaAbsoluta = path.join(ASSETS_DIR, rutaRelativa);
  const stats = fs.statSync(rutaAbsoluta);
  const extension = path.extname(rutaAbsoluta).toLowerCase();
  const mimetype = MIME_POR_EXTENSION[extension] ?? 'application/octet-stream';

  const uploadService = app.plugin('upload').service('upload');
  const [archivo] = await uploadService.upload({
    data: { fileInfo: { alternativeText } },
    files: {
      filepath: rutaAbsoluta,
      originalFilename: path.basename(rutaAbsoluta),
      mimetype,
      size: stats.size,
    },
  });

  return archivo.id;
}

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

      const { categoriaSlug, portadaArchivo, portadaAlt, ...datos } = def;

      let portadaId: number | undefined;
      if (portadaArchivo) {
        portadaId = await subirImagen(app, portadaArchivo, portadaAlt ?? '');
      }

      await app.documents(PAGINA_UID).create({
        data: { ...datos, categoria: categorias[categoriaSlug], portada: portadaId },
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
