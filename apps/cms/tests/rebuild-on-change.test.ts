import { setupStrapi, cleanupStrapi } from './helpers/strapi';

const PAGINA_UID = 'api::pagina.pagina' as const;
const SECCION_UID = 'api::seccion.seccion' as const;

// La app real (cargada desde dist/, ver tests/helpers/strapi.ts) y este
// archivo de test (transformado en vivo por ts-jest desde src/) NO comparten
// instancia de módulo para rebuild-trigger.ts, ni Jest puede acelerar los
// timers que corren dentro de dist/. Por eso este test usa timers REALES con
// una ventana de debounce mínima (REBUILD_DEBOUNCE_MS, seteada abajo antes de
// arrancar la app) y observa el efecto compartido de verdad: el fetch global.
const DEBOUNCE_MS = 50;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('rebuild-on-change: qué acciones disparan el webhook agrupado', () => {
  const originalFetch = global.fetch;
  let seccionId: string;

  beforeAll(async () => {
    process.env.REBUILD_WEBHOOK_URL = 'https://example.test/rebuild';
    process.env.REBUILD_WEBHOOK_SECRET = 'test-secret';
    process.env.REBUILD_DEBOUNCE_MS = String(DEBOUNCE_MS);
    process.env.REBUILD_MAX_WAIT_MS = '200';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await setupStrapi();

    const seccion = await strapi.documents(SECCION_UID).create({
      data: { nombre: '[DATOS DE PRUEBA] Sección rebuild', slug: `seccion-rebuild-${Date.now()}`, orden: 1 },
    });
    seccionId = seccion.documentId;
    await esperar(DEBOUNCE_MS * 4);
    (global.fetch as jest.Mock).mockClear();
  }, 60000);

  afterAll(async () => {
    global.fetch = originalFetch;
    delete process.env.REBUILD_WEBHOOK_URL;
    delete process.env.REBUILD_WEBHOOK_SECRET;
    delete process.env.REBUILD_DEBOUNCE_MS;
    delete process.env.REBUILD_MAX_WAIT_MS;
    await cleanupStrapi();
  });

  afterEach(async () => {
    await esperar(DEBOUNCE_MS * 4);
    (global.fetch as jest.Mock).mockClear();
  });

  it('dispara el webhook al crear-y-publicar una página', async () => {
    await strapi.documents(PAGINA_UID).create({
      data: {
        titulo: '[DATOS DE PRUEBA] Página publicada',
        slug: `pagina-publicada-${Date.now()}`,
        resumen: 'resumen de prueba',
        seccion: seccionId,
        nivelSensibilidad: 'general',
      },
      status: 'published',
    });

    await esperar(DEBOUNCE_MS * 4);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('NO dispara el webhook al guardar una página como borrador', async () => {
    await strapi.documents(PAGINA_UID).create({
      data: {
        titulo: '[DATOS DE PRUEBA] Página borrador',
        slug: `pagina-borrador-${Date.now()}`,
        resumen: 'resumen de prueba',
        seccion: seccionId,
        nivelSensibilidad: 'general',
      },
    });

    await esperar(DEBOUNCE_MS * 4);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('dispara el webhook al crear una sección (siempre vivo, sin draft/publish)', async () => {
    await strapi.documents(SECCION_UID).create({
      data: { nombre: '[DATOS DE PRUEBA] Otra sección', slug: `otra-seccion-${Date.now()}`, orden: 2 },
    });

    await esperar(DEBOUNCE_MS * 4);
    expect(global.fetch).toHaveBeenCalled();
  });
});
