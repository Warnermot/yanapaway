import { setupStrapi, cleanupStrapi } from './helpers/strapi';

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
    verificadoEn: daysAgo(10),
    activa: true,
    esEmergencia: false,
    ...overrides,
  };
}

// Regla no negociable del brief: no se puede publicar ni mantener publicada
// una institución cuya `verificadoEn` tenga más de 180 días. Un teléfono de
// emergencia desactualizado es un fallo con consecuencias reales. La regla
// vive en el backend (document service middleware), no solo como validación
// de formulario, para que no se pueda saltear vía API.
describe('Reglas de negocio de Institución', () => {
  beforeAll(async () => {
    await setupStrapi();
  }, 60000);

  afterAll(async () => {
    await cleanupStrapi();
  });

  describe('Vigencia de verificación (verificadoEn)', () => {
    it('rechaza crear-y-publicar con verificadoEn vencida (> 180 días)', async () => {
      await expect(
        strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(200) }), status: 'published' })
      ).rejects.toThrow();
    });

    it('permite crear-y-publicar con verificadoEn vigente', async () => {
      const doc = await strapi
        .documents(UID)
        .create({ data: baseData({ verificadoEn: daysAgo(10) }), status: 'published' });
      expect(doc.documentId).toBeDefined();
    });

    it('rechaza la acción publish sobre un borrador con verificadoEn vencida', async () => {
      const draft = await strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(200) }) });
      await expect(strapi.documents(UID).publish({ documentId: draft.documentId })).rejects.toThrow();
    });

    it('permite la acción publish sobre un borrador con verificadoEn vigente', async () => {
      const draft = await strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(5) }) });
      await expect(strapi.documents(UID).publish({ documentId: draft.documentId })).resolves.toBeDefined();
    });

    it('rechaza un update con status "published" sobre una institución vencida, no solo la acción publish', async () => {
      const draft = await strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(200) }) });
      await expect(
        strapi.documents(UID).update({ documentId: draft.documentId, data: {}, status: 'published' })
      ).rejects.toThrow();
    });

    it('rechaza publicar cuando falta verificadoEn', async () => {
      const data = baseData();
      delete (data as Record<string, unknown>).verificadoEn;
      await expect(strapi.documents(UID).create({ data, status: 'published' })).rejects.toThrow();
    });

    it('permite guardar como borrador sin importar la vigencia de verificadoEn', async () => {
      await expect(
        strapi.documents(UID).create({ data: baseData({ verificadoEn: daysAgo(500) }) })
      ).resolves.toBeDefined();
    });
  });

  describe('Baja lógica (nunca borrado físico)', () => {
    it('rechaza el borrado de una institución', async () => {
      const doc = await strapi.documents(UID).create({ data: baseData() });
      await expect(strapi.documents(UID).delete({ documentId: doc.documentId })).rejects.toThrow();
    });

    it('permite la baja lógica con activa=false en lugar de borrar', async () => {
      const doc = await strapi.documents(UID).create({ data: baseData() });
      const updated = await strapi.documents(UID).update({
        documentId: doc.documentId,
        data: { activa: false },
      });
      expect(updated?.activa).toBe(false);
    });
  });
});
