import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Core } from '@strapi/strapi';

// Import estático evitado a propósito: el build ESM (.mjs) de @strapi/core
// hace un import de directorio de "lodash/fp" que Node/Vite no resuelven
// bajo ESM estricto (falla con ERR_UNSUPPORTED_DIR_IMPORT). El build CJS
// no tiene ese problema, así que se fuerza su resolución vía require().
const strapiFactory = createRequire(import.meta.url)('@strapi/strapi') as {
  createStrapi: typeof import('@strapi/strapi').createStrapi;
  compileStrapi: typeof import('@strapi/strapi').compileStrapi;
};
const { createStrapi, compileStrapi } = strapiFactory;

// Las pruebas de este módulo corren contra un Strapi real (en memoria vía
// sqlite, entorno "test") en vez de mockear la API — mismo criterio que se
// usaba antes con Testcontainers + Postgres real para Drizzle: probar
// contra el sistema real, no contra una simulación.
const CMS_APP_DIR = path.resolve(__dirname, '../../../cms');
const NOMBRE_TOKEN_INTEGRACION = 'Integración sitio (apps/web)';

export type ServidorCmsPrueba = {
  strapi: Core.Strapi;
  url: string;
};

function claveAleatoria(): string {
  return crypto.randomBytes(16).toString('base64');
}

function puertoAleatorio(): number {
  return 15500 + Math.floor(Math.random() * 2000);
}

export async function iniciarCmsDePrueba(): Promise<ServidorCmsPrueba> {
  const puerto = puertoAleatorio();

  process.env.NODE_ENV = 'test';
  process.env.HOST = '127.0.0.1';
  process.env.PORT = String(puerto);
  process.env.APP_KEYS = `${claveAleatoria()},${claveAleatoria()}`;
  process.env.API_TOKEN_SALT = claveAleatoria();
  process.env.ADMIN_JWT_SECRET = claveAleatoria();
  process.env.TRANSFER_TOKEN_SALT = claveAleatoria();
  process.env.JWT_SECRET = claveAleatoria();
  process.env.ENCRYPTION_KEY = claveAleatoria();
  process.env.SEED_WEB_API_TOKEN = 'true';

  const appContext = await compileStrapi({ appDir: CMS_APP_DIR });
  const strapi = await createStrapi(appContext).load();

  await new Promise<void>((resolve, reject) => {
    const httpServer = strapi.server.httpServer;
    httpServer.once('error', reject);
    strapi.server.listen(puerto, '127.0.0.1', () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });

  const servicioTokens = strapi.service('admin::api-token-content-api');
  const tokenEntry = await servicioTokens.getByName(NOMBRE_TOKEN_INTEGRACION, {
    includeDecryptedKey: true,
  });

  if (!tokenEntry?.accessKey) {
    throw new Error(
      'No se encontró el token de integración tras el arranque del CMS de prueba (ver apps/cms/src/bootstrap/token-integracion-web.ts).',
    );
  }

  const url = `http://127.0.0.1:${puerto}`;

  // lib/strapi.ts lee estas variables una sola vez al importarse: hay que
  // fijarlas ANTES de importar (dinámicamente) el endpoint bajo prueba.
  process.env.STRAPI_URL = url;
  process.env.STRAPI_API_TOKEN = tokenEntry.accessKey;

  return { strapi, url };
}

export async function detenerCmsDePrueba(servidor: ServidorCmsPrueba): Promise<void> {
  await servidor.strapi.destroy();
}
