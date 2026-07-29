import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Los tests que arrancan un Strapi real (ver test-utils/servidor-cms-prueba.ts)
    // compilan apps/cms con tsc a un único directorio dist/ compartido; correr
    // esos archivos de test en paralelo hace que dos compilaciones escriban al
    // mismo dist/ a la vez y corrompan el arranque del otro proceso.
    fileParallelism: false,
    // Strapi.destroy() llama process.removeAllListeners() (ver
    // @strapi/core/dist/Strapi.js), lo que rompe la IPC del pool "forks"
    // (basada en eventos de `process`) y hace que el worker truene después
    // de que los tests ya pasaron. El pool "threads" no depende de esa IPC.
    pool: 'threads',
  },
});
