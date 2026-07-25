// Harness de test oficial de Strapi 5 (docs.strapi.io/cms/testing), adaptado
// a TypeScript + Vitest. Levanta una instancia real de Strapi contra sqlite
// en memoria (ver config/env/test/database.ts) y la expone en `global.strapi`
// para poder usar el Document Service y golpear rutas HTTP con supertest.
// Debe ir antes que cualquier import de @strapi/strapi: registra soporte
// de config/*.ts para cuando arrancamos Strapi fuera de su propio CLI.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('../strapi-ts-patch.cjs');

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

  await global.strapi.server.httpServer.close();
  await global.strapi.db.connection.destroy();

  if (typeof global.strapi.destroy === 'function') {
    await global.strapi.destroy();
  }

  instance = undefined;
  // @ts-expect-error — dejar el global limpio entre archivos de test
  global.strapi = undefined;
}
