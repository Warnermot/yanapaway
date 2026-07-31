/**
 * Carga en Strapi el directorio real de instituciones para Sucre (fuente de
 * verdad del módulo, reemplaza al seed que antes vivía en apps/web/src/db).
 *
 * Los datos (nombres, direcciones, teléfonos, coordenadas) están verificados
 * contra fuentes reales (Correo del Sur, tramitesenbolivia.com,
 * defensoria.gob.bo, consultaslegales.com.bo, coordenadas cruzadas con
 * OpenStreetMap/Nominatim) — no son datos de ejemplo inventados. Aun así,
 * quien administre el panel debe confirmarlas/actualizarlas periódicamente
 * (ver la regla de los 180 días en institucion-reglas.ts): son un punto de
 * partida razonable, no la fuente de verdad definitiva para siempre.
 *
 * Idempotente: revisa por nombre antes de crear. Uso: pnpm --filter cms
 * seed:instituciones
 */
import { createStrapi, compileStrapi } from '@strapi/strapi';
import fs from 'node:fs';
import path from 'node:path';

// Las imágenes viven en apps/web (assets de Astro); el CMS las sube a su
// propia media library una sola vez, en el primer seed (ver seed-recursos.ts,
// que usa el mismo patrón para las portadas de Página).
const ASSETS_DIR = path.resolve(__dirname, '../../web/src/assets/images');

const MIME_POR_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

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

type TipoInstitucion =
  | 'defensoria'
  | 'felcv'
  | 'fiscalia'
  | 'policia'
  | 'slim'
  | 'linea_emergencia'
  | 'psicologico'
  | 'ong'
  | 'refugio'
  | 'otro';

type SedeSeed = {
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
};

type InstitucionSeed = {
  nombre: string;
  tipo: TipoInstitucion;
  descripcion: string;
  direccion?: string;
  ciudad: string;
  telefono?: string;
  esEmergencia?: boolean;
  latitud?: number;
  longitud?: number;
  tiposCasoAtendidos: string[];
  sedes?: SedeSeed[];
  /** Ruta relativa a ASSETS_DIR (p. ej. "contactos/foo.png"). Opcional. */
  imagenArchivo?: string;
  imagenAlt?: string;
};

const TIPOS_CASO: Array<{ nombre: string; descripcion: string }> = [
  { nombre: 'violencia_noviazgo', descripcion: 'Violencia dentro de una relación de pareja adolescente.' },
  { nombre: 'grooming', descripcion: 'Un adulto se gana la confianza de un menor en línea con fines de abuso.' },
  { nombre: 'sextorsion', descripcion: 'Extorsión usando imágenes o videos íntimos como amenaza.' },
  { nombre: 'control_digital', descripcion: 'Vigilancia o control abusivo a través de dispositivos o redes.' },
  { nombre: 'consentimiento', descripcion: 'Consultas sobre consentimiento y difusión de contenido íntimo.' },
];

const INSTITUCIONES: InstitucionSeed[] = [
  {
    nombre: 'FELCV',
    tipo: 'felcv',
    descripcion:
      'Fuerza Especial de Lucha Contra la Violencia. Atiende en 4 puntos de la ciudad: ' +
      'Dirección Departamental en la EPI de Patacón, EPI Villa Armonía, EPI de Tránsito ' +
      '(calle Junín) y oficina en calle Eduardo Berdecio (a la altura del puente). ' +
      'Recepción de denuncias y acompañamiento en casos de violencia digital y de género.',
    direccion: 'Sucre — 4 sedes',
    ciudad: 'Sucre',
    telefono: '800140348',
    esEmergencia: true,
    imagenArchivo: 'contactos/flcv.png',
    imagenAlt: 'Oficiales de la FELCV formados frente a su edificio en Sucre.',
    tiposCasoAtendidos: ['grooming', 'sextorsion', 'control_digital', 'violencia_noviazgo'],
    sedes: [
      {
        nombre: 'EPI Patacón (sede departamental)',
        direccion: 'EPI Patacón, zona Patacón, Sucre',
        latitud: -19.028333,
        longitud: -65.2659987,
      },
      {
        nombre: 'EPI Villa Armonía',
        direccion: 'EPI Villa Armonía, zona Villa Armonía, Sucre',
        latitud: -19.0178901,
        longitud: -65.2660176,
      },
      {
        nombre: 'EPI de Tránsito',
        direccion: 'Calle Junín, Sucre',
        latitud: -19.0476594,
        longitud: -65.2617477,
      },
      {
        nombre: 'Oficina Eduardo Berdecio',
        direccion: 'Calle Eduardo Berdecio (a la altura del puente), Sucre',
        latitud: -19.0443363,
        longitud: -65.2522586,
      },
    ],
  },
  {
    nombre: 'Defensoría de la Niñez y Adolescencia',
    tipo: 'defensoria',
    descripcion:
      'Orientación, protección y seguimiento de casos que involucran a menores de edad. ' +
      'Atiende de forma descentralizada en distintos distritos de la ciudad. Primer punto ' +
      'de contacto recomendado.',
    direccion: 'Sucre — 2 sedes',
    ciudad: 'Sucre',
    telefono: '+59146452000',
    tiposCasoAtendidos: ['consentimiento', 'violencia_noviazgo'],
    sedes: [
      {
        nombre: 'Defensoría D-5',
        direccion: 'Urbanización Fabriles, Sucre',
        latitud: -19.048962,
        longitud: -65.242073,
      },
      {
        nombre: 'Defensoría Poconas',
        direccion: 'Calle Néstor Enríquez, zona Poconas, Sucre',
        latitud: -19.046751,
        longitud: -65.251289,
      },
    ],
  },
  {
    nombre: 'Servicio Legal Integral Municipal',
    tipo: 'slim',
    descripcion:
      'Servicio Legal Integral Municipal. Orientación legal y psicológica gratuita para ' +
      'adolescentes y sus familias.',
    direccion: 'Calle Santa Lucía, zona Mesa Verde, Sucre',
    ciudad: 'Sucre',
    telefono: '+59146453000',
    latitud: -19.0426251,
    longitud: -65.2408632,
    tiposCasoAtendidos: ['violencia_noviazgo'],
  },
  {
    nombre: 'Fiscalía Departamental de Chuquisaca',
    tipo: 'fiscalia',
    descripcion:
      'Recepción formal de denuncias penales por sextorsión y grooming; inicia ' +
      'investigación y coordina con FELCV.',
    direccion: 'Calle Kilómetro 7 Nº 282, zona San Cristóbal, Sucre',
    ciudad: 'Sucre',
    telefono: '4-6453661',
    latitud: -19.042940139770508,
    longitud: -65.26390075683594,
    imagenArchivo: 'contactos/fiscalia-sucre.png',
    imagenAlt: 'Acto público en el edificio de la Fiscalía Departamental de Chuquisaca, en Sucre.',
    tiposCasoAtendidos: ['grooming', 'sextorsion'],
  },
];

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const tipoCasoUID = 'api::tipo-caso.tipo-caso';
    const institucionUID = 'api::institucion.institucion';
    const sedeUID = 'api::sede-institucion.sede-institucion';

    const tiposCasoIdPorNombre = new Map<string, string>();
    for (const def of TIPOS_CASO) {
      const existente = await app.documents(tipoCasoUID).findFirst({ filters: { nombre: def.nombre } });
      const doc = existente ?? (await app.documents(tipoCasoUID).create({ data: def }));
      tiposCasoIdPorNombre.set(def.nombre, doc.documentId);
    }

    let creadas = 0;
    let omitidas = 0;
    let imagenesRellenadas = 0;

    for (const dato of INSTITUCIONES) {
      const existente = await app
        .documents(institucionUID)
        .findFirst({ filters: { nombre: dato.nombre } });

      if (existente) {
        omitidas += 1;

        // Chequea el estado PUBLICADO (que es el que sirve la API pública),
        // no el borrador: update() por sí solo no publica, así que el
        // borrador puede tener la imagen puesta de una corrida anterior
        // mientras la versión pública seguía sin ella.
        const publicado = await app
          .documents(institucionUID)
          .findOne({ documentId: existente.documentId, status: 'published', populate: ['imagen'] });

        // El registro ya existía (de una corrida anterior del seed, antes de
        // que el schema tuviera campo `imagen`): si ahora tenemos una foto
        // real para él y la versión publicada no la tiene, se la agregamos
        // sin tocar el resto de sus datos.
        if (dato.imagenArchivo && !publicado?.imagen) {
          const imagenId = await subirImagen(app, dato.imagenArchivo, dato.imagenAlt ?? '');
          await app.documents(institucionUID).update({
            documentId: existente.documentId,
            data: { imagen: imagenId },
          });
          // update() solo toca el borrador; hay que publicar aparte para que
          // el cambio se refleje en la API pública que usa el sitio.
          await app.documents(institucionUID).publish({ documentId: existente.documentId });
          imagenesRellenadas += 1;
        }

        continue;
      }

      const tiposCasoIds = dato.tiposCasoAtendidos
        .map((nombre) => tiposCasoIdPorNombre.get(nombre))
        .filter((id): id is string => Boolean(id));

      let imagenId: number | undefined;
      if (dato.imagenArchivo) {
        imagenId = await subirImagen(app, dato.imagenArchivo, dato.imagenAlt ?? '');
      }

      const institucion = await app.documents(institucionUID).create({
        data: {
          nombre: dato.nombre,
          tipo: dato.tipo,
          descripcion: dato.descripcion,
          direccion: dato.direccion,
          ciudad: dato.ciudad,
          esEmergencia: dato.esEmergencia ?? false,
          verificadoEn: hoyISO(),
          activa: true,
          latitud: dato.latitud,
          longitud: dato.longitud,
          telefonos: dato.telefono ? [{ numero: dato.telefono, esGratuito: false }] : [],
          imagen: imagenId,
          tiposCaso: tiposCasoIds,
        },
        status: 'published',
      });

      if (dato.sedes && dato.sedes.length > 0) {
        for (const sede of dato.sedes) {
          await app.documents(sedeUID).create({
            data: { ...sede, institucion: institucion.documentId },
          });
        }
      }

      creadas += 1;
    }

    app.log.info(
      `[seed-instituciones] Completo: ${creadas} creadas, ${omitidas} ya existían (${imagenesRellenadas} de esas se les agregó imagen).`,
    );
  } finally {
    await app.destroy();
  }

  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[seed-instituciones] Falló la carga de instituciones:', error);
  process.exit(1);
});
