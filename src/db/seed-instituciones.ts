import { eq } from 'drizzle-orm';
import { db, pool } from './client';
import {
  instituciones,
  institucionesTiposCaso,
  sedesInstitucion,
  tiposCaso,
  type tipoInstitucionEnum,
} from './schema';

/**
 * Instituciones de referencia para Sucre, verificadas contra fuentes
 * reales (Correo del Sur, tramitesenbolivia.com, defensoria.gob.bo,
 * consultaslegales.com.bo, y coordenadas cruzadas con OpenStreetMap/
 * Nominatim) — no son datos de ejemplo inventados. Aun así, quien cargue
 * el panel admin del CMS debe confirmarlas/actualizarlas: son un punto
 * de partida razonable, no la fuente de verdad definitiva.
 */

type TipoInstitucion = (typeof tipoInstitucionEnum.enumValues)[number];

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
  direccion: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
  tiposCasoAtendidos: string[];
  sedes?: SedeSeed[];
};

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
    telefono: '800140348',
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
    telefono: '4-6453661',
    latitud: -19.042940139770508,
    longitud: -65.26390075683594,
    tiposCasoAtendidos: ['grooming', 'sextorsion'],
  },
];

async function institucionYaExiste(nombre: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: instituciones.id })
    .from(instituciones)
    .where(eq(instituciones.nombre, nombre));
  return Boolean(fila);
}

async function seedInstituciones() {
  const tiposCasoPorNombre = new Map(
    (await db.select().from(tiposCaso)).map((tipoCaso) => [tipoCaso.nombre, tipoCaso.id]),
  );

  if (tiposCasoPorNombre.size === 0) {
    throw new Error('Corre primero "pnpm db:seed" para sembrar los tipos de caso.');
  }

  let creadas = 0;
  let omitidas = 0;

  for (const dato of INSTITUCIONES) {
    if (await institucionYaExiste(dato.nombre)) {
      omitidas += 1;
      continue;
    }

    const [institucion] = await db
      .insert(instituciones)
      .values({
        nombre: dato.nombre,
        tipo: dato.tipo,
        descripcion: dato.descripcion,
        direccion: dato.direccion,
        telefono: dato.telefono,
        latitud: dato.latitud,
        longitud: dato.longitud,
      })
      .returning();

    if (dato.sedes && dato.sedes.length > 0) {
      await db
        .insert(sedesInstitucion)
        .values(dato.sedes.map((sede) => ({ institucionId: institucion.id, ...sede })));
    }

    const idsTiposCaso = dato.tiposCasoAtendidos
      .map((nombre) => tiposCasoPorNombre.get(nombre))
      .filter((id): id is string => Boolean(id));

    if (idsTiposCaso.length > 0) {
      await db
        .insert(institucionesTiposCaso)
        .values(idsTiposCaso.map((tipoCasoId) => ({ institucionId: institucion.id, tipoCasoId })));
    }

    creadas += 1;
  }

  console.log(`Seed de instituciones completo: ${creadas} creadas, ${omitidas} ya existían.`);
  await pool.end();
}

seedInstituciones();
