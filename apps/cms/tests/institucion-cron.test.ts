import { setupStrapi, cleanupStrapi } from './helpers/strapi';
import { despublicarInstitucionesVencidas } from '../src/cron/despublicar-vencidas';

const UID = 'api::institucion.institucion' as const;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function baseData(overrides: Record<string, unknown> = {}) {
  return {
    nombre: '[DATOS DE PRUEBA] Institución de prueba',
    tipo: 'ong' as const,
    descripcion: 'Descripción de prueba',
    ciudad: 'Ciudad de prueba',
    telefonos: [{ numero: '000-000-0000', esGratuito: false }],
    verificadoEn: daysAgo(5),
    activa: true,
    esEmergencia: false,
    ...overrides,
  };
}

// La regla de los 180 días tiene dos mitades: no se puede PUBLICAR una
// institución vencida (cubierto en institucion-reglas.test.ts) y tampoco se
// puede MANTENER publicada una que venció después de publicarse. Esta
// segunda mitad necesita un job: nadie va a volver a tocar el registro para
// que el middleware de publish la agarre. El cron la despublica (nunca la
// borra) y deja rastro en el log.
async function backdateVerificadoEn(documentId: string, verificadoEn: string) {
  // Actualiza la fila directamente por fuera del document service: así se
  // simula "estaba vigente cuando se publicó, y venció con el tiempo" sin
  // pasar de nuevo por el middleware que bloquea publicar.
  await strapi.db.query(UID).updateMany({ where: { documentId }, data: { verificadoEn } });
}

describe('Cron: despublicar instituciones vencidas', () => {
  beforeAll(async () => {
    await setupStrapi();
  }, 60000);

  afterAll(async () => {
    await cleanupStrapi();
  });

  it('despublica una institución publicada cuya verificadoEn venció después de publicarse', async () => {
    const doc = await strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(5) }), status: 'published' });
    await backdateVerificadoEn(doc.documentId, daysAgo(200));

    const resultado = await despublicarInstitucionesVencidas({ strapi });

    expect(resultado.despublicadas).toBeGreaterThanOrEqual(1);
    const actual = await strapi.documents(UID).findOne({ documentId: doc.documentId, status: 'published' });
    expect(actual).toBeNull();
  });

  it('no toca una institución publicada cuya verificadoEn sigue vigente', async () => {
    const doc = await strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(5) }), status: 'published' });

    await despublicarInstitucionesVencidas({ strapi });

    const actual = await strapi.documents(UID).findOne({ documentId: doc.documentId, status: 'published' });
    expect(actual).not.toBeNull();
  });

  it('loguea un aviso (sin despublicar) para las que vencen en los próximos 15 días', async () => {
    const doc = await strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(5) }), status: 'published' });
    await backdateVerificadoEn(doc.documentId, daysAgo(170));

    const warnSpy = jest.spyOn(strapi.log, 'warn');
    const resultado = await despublicarInstitucionesVencidas({ strapi });

    expect(resultado.porVencerPronto).toBeGreaterThanOrEqual(1);
    expect(warnSpy).toHaveBeenCalled();

    const actual = await strapi.documents(UID).findOne({ documentId: doc.documentId, status: 'published' });
    expect(actual).not.toBeNull();

    warnSpy.mockRestore();
  });

  it('no despublica instituciones en borrador (solo actúa sobre publicadas)', async () => {
    const doc = await strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(200) }) });

    const resultado = await despublicarInstitucionesVencidas({ strapi });

    expect(resultado.despublicadas).toBe(0);
    const draft = await strapi.documents(UID).findOne({ documentId: doc.documentId, status: 'draft' });
    expect(draft).not.toBeNull();
  });
});
