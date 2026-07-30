// Harness de test oficial de Strapi 5 (docs.strapi.io/cms/testing), adaptado
// a TypeScript + Vitest. Levanta una instancia real de Strapi contra sqlite
// en memoria (ver config/env/test/database.ts) y la expone en `global.strapi`
// para poder usar el Document Service y golpear rutas HTTP con supertest.
// Debe ir antes que cualquier import de @strapi/strapi: registra soporte
// de config/*.ts para cuando arrancamos Strapi fuera de su propio CLI.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('../strapi-ts-patch.cjs');

import fs from 'fs/promises';
import path from 'path';
import type { Core } from '@strapi/strapi';

declare global {
  // eslint-disable-next-line no-var
  var strapi: Core.Strapi;
}

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.APP_KEYS = process.env.APP_KEYS || 'testKeyOne,testKeyTwo';
process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'test-api-token-salt';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret';
process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'test-transfer-token-salt';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.DATABASE_CLIENT = 'sqlite';
process.env.DATABASE_FILENAME = ':memory:';
process.env.STRAPI_DISABLE_CRON = 'true';
process.env.PORT = process.env.PORT || '0';
process.env.VERIFICACION_MAX_DIAS = process.env.VERIFICACION_MAX_DIAS || '180';

let instance: Core.Strapi | undefined;

export async function setupStrapi(): Promise<Core.Strapi> {
  if (!instance) {
    const { createStrapi } = await import('@strapi/strapi');
    // Sin distDir explícito, Strapi asume distDir === appDir (cwd) y busca
    // el register()/bootstrap() del usuario en <cwd>/src/index.js — pero
    // nuestro tsconfig compila con outDir "dist", así que el compilado real
    // vive en <cwd>/dist/src/index.js. `strapi develop`/`strapi start` le
    // pasan distDir correctamente; acá hay que hacerlo a mano. Sin esto,
    // Strapi arranca "bien" (bootea, sirve rutas) pero nunca carga
    // src/index.ts — register()/bootstrap() del usuario quedan sin correr,
    // en silencio, sin ningún error. Requiere haber corrido `tsc` antes
    // (ver el script "pretest").
    instance = await createStrapi({
      appDir: process.cwd(),
      distDir: path.join(process.cwd(), 'dist'),
    }).load();
    await instance.start();
    global.strapi = instance;
  }
  return instance;
}

export async function cleanupStrapi(): Promise<void> {
  if (!global.strapi) {
    return;
  }

  // El archivo sqlite es único por archivo de test (ver config/env/test/database.ts)
  // y no se vuelve a usar: hay que anotarlo antes de destruir la conexión para
  // poder borrarlo después y no dejar 1,5 MB de basura por corrida en .tmp/.
  const sqliteFile = (
    global.strapi.db.connection.client?.config?.connection as { filename?: string } | undefined
  )?.filename;

  // `strapi.destroy()` ya cierra el servidor HTTP y destruye el pool de knex,
  // en ese orden y esperando lo que quede en vuelo. Destruir el pool a mano
  // antes deja pendientes las operaciones que Strapi todavía va a hacer
  // durante su propio apagado: tarn las aborta con un `Error: aborted` que
  // nadie maneja, y el proceso de Jest muere sin imprimir resultados.
  if (typeof global.strapi.destroy === 'function') {
    await global.strapi.destroy();
  } else {
    await global.strapi.server.httpServer.close();
    await global.strapi.db.connection.destroy();
  }

  if (sqliteFile && sqliteFile !== ':memory:') {
    await fs.rm(sqliteFile, { force: true });
  }

  instance = undefined;
  // @ts-expect-error — dejar el global limpio entre archivos de test
  global.strapi = undefined;
}
