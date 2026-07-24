import {
  scheduleRebuild,
  __resetDebounceStateForTests,
} from '../src/services/rebuild-trigger';

function fakeStrapi() {
  return { log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } };
}

// El brief pide que varias publicaciones en poco tiempo disparen UNA sola
// reconstrucción del sitio Astro, no una por cambio. Este módulo agrupa
// (debounce trailing de 60s, con un tope de 5 min para no postergar
// indefinidamente ante actividad continua) y firma el POST con
// REBUILD_WEBHOOK_SECRET para que el receptor pueda verificar el origen.
describe('rebuild-trigger: debounce + webhook agrupado', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    process.env.REBUILD_WEBHOOK_URL = 'https://example.test/rebuild';
    process.env.REBUILD_WEBHOOK_SECRET = 'test-secret';
    __resetDebounceStateForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    __resetDebounceStateForTests();
  });

  it('agrupa cinco disparos seguidos dentro de la ventana de debounce en un solo POST', async () => {
    const strapi = fakeStrapi();
    for (let i = 0; i < 5; i++) {
      scheduleRebuild({ strapi } as never);
      await jest.advanceTimersByTimeAsync(1000);
    }
    await jest.advanceTimersByTimeAsync(60_000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('firma el body con HMAC usando REBUILD_WEBHOOK_SECRET', async () => {
    const strapi = fakeStrapi();
    scheduleRebuild({ strapi } as never);
    await jest.advanceTimersByTimeAsync(60_000);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['X-Rebuild-Signature']).toEqual(expect.any(String));
    expect(options.headers['X-Rebuild-Signature'].length).toBeGreaterThan(0);
  });

  it('no dispara nada si REBUILD_WEBHOOK_URL no está seteada (y lo loguea)', async () => {
    delete process.env.REBUILD_WEBHOOK_URL;
    const strapi = fakeStrapi();
    scheduleRebuild({ strapi } as never);
    await jest.advanceTimersByTimeAsync(60_000);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(strapi.log.info).toHaveBeenCalled();
  });

  it('reintenta con backoff si el POST falla, hasta 3 intentos', async () => {
    const strapi = fakeStrapi();
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    scheduleRebuild({ strapi } as never);
    await jest.advanceTimersByTimeAsync(60_000 + 10_000);

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('loguea error si los 3 intentos fallan', async () => {
    const strapi = fakeStrapi();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('siempre falla'));

    scheduleRebuild({ strapi } as never);
    await jest.advanceTimersByTimeAsync(60_000 + 10_000);

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(strapi.log.error).toHaveBeenCalled();
  });

  it('fuerza un flush al llegar al maxWait aunque sigan llegando disparos', async () => {
    const strapi = fakeStrapi();
    // Empuja el debounce cada 50s (por debajo de la ventana de 60s) durante
    // más de 5 minutos: el maxWait debe forzar un flush igual.
    for (let i = 0; i < 7; i++) {
      scheduleRebuild({ strapi } as never);
      await jest.advanceTimersByTimeAsync(50_000);
    }
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
