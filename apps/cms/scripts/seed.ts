/**
 * Carga datos de PRUEBA claramente ficticios para desarrollo local.
 *
 * Guarda dura: aborta si NODE_ENV === 'production'. Un dato de prueba
 * llegando a producción no debe poder poner a nadie a marcar un número
 * inexistente en una emergencia. Por eso además todo lleva el prefijo
 * "[DATOS DE PRUEBA]" y los teléfonos no son marcables (000-000-0000).
 *
 * Uso: pnpm --filter cms seed
 */
import { createStrapi, compileStrapi } from '@strapi/strapi';

const PREFIJO = '[DATOS DE PRUEBA]';
const TEL_NO_MARCABLE = '000-000-0000';

function hoyMenosDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error('✋ El seed de datos de prueba está deshabilitado en producción. Abortando.');
    process.exit(1);
  }

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const categoriaUID = 'api::categoria-recurso.categoria-recurso';
    const paginaUID = 'api::pagina.pagina';
    const institucionUID = 'api::institucion.institucion';

    // --- Categorías de recurso ---
    const categoriasDef = [
      { nombre: `${PREFIJO} Reconocer la violencia`, slug: 'reconocer-la-violencia', orden: 1 },
      { nombre: `${PREFIJO} Aspectos legales`, slug: 'aspectos-legales', orden: 2 },
    ];

    const categorias: Record<string, string> = {};
    for (const def of categoriasDef) {
      const existente = await app.documents(categoriaUID).findFirst({ filters: { slug: def.slug } });
      const doc = existente ?? (await app.documents(categoriaUID).create({ data: def }));
      categorias[def.slug] = doc.documentId;
    }

    // --- Páginas (publicadas) ---
    const paginasDef = [
      {
        titulo: `${PREFIJO} ¿Qué es la violencia de pareja?`,
        slug: 'que-es-la-violencia-de-pareja',
        resumen: 'Contenido de ejemplo para desarrollo. No es material real de apoyo.',
        categoria: categorias['reconocer-la-violencia'],
        nivelSensibilidad: 'sensible' as const,
        orden: 1,
      },
      {
        titulo: `${PREFIJO} Tus derechos`,
        slug: 'tus-derechos',
        resumen: 'Contenido de ejemplo para desarrollo. No es asesoría legal real.',
        categoria: categorias['aspectos-legales'],
        nivelSensibilidad: 'general' as const,
        orden: 1,
      },
    ];

    for (const def of paginasDef) {
      const existente = await app.documents(paginaUID).findFirst({ filters: { slug: def.slug } });
      if (!existente) {
        await app.documents(paginaUID).create({ data: def, status: 'published' });
      }
    }

    // --- Instituciones (publicadas, con verificación vigente) ---
    const institucionesDef = [
      {
        nombre: `${PREFIJO} Línea de emergencia (ejemplo)`,
        tipo: 'linea_emergencia' as const,
        descripcion: 'Institución de ejemplo para desarrollo. NO es un número real.',
        telefonos: [{ numero: TEL_NO_MARCABLE, etiqueta: 'No marcable (prueba)', esGratuito: true }],
        ciudad: 'Ciudad de Prueba',
        horario: '24 horas',
        esEmergencia: true,
        verificadoEn: hoyMenosDias(10),
        activa: true,
      },
      {
        nombre: `${PREFIJO} Centro de apoyo psicológico (ejemplo)`,
        tipo: 'psicologico' as const,
        descripcion: 'Institución de ejemplo para desarrollo. NO es un número real.',
        telefonos: [{ numero: TEL_NO_MARCABLE, etiqueta: 'No marcable (prueba)', esGratuito: false }],
        ciudad: 'Ciudad de Prueba',
        horario: 'L-V 8:00-16:00',
        esEmergencia: false,
        verificadoEn: hoyMenosDias(30),
        activa: true,
      },
    ];

    for (const def of institucionesDef) {
      const existente = await app.documents(institucionUID).findFirst({ filters: { nombre: def.nombre } });
      if (!existente) {
        await app.documents(institucionUID).create({ data: def, status: 'published' });
      }
    }

    app.log.info(`[seed] Datos de prueba cargados (todos con prefijo "${PREFIJO}").`);
  } finally {
    await app.destroy();
  }

  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Falló la carga de datos de prueba:', error);
  process.exit(1);
});
