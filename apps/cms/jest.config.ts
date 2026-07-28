import type { Config } from 'jest';

// Strapi solo da soporte oficial a Jest para levantar una instancia real
// (createStrapi().load()) fuera de su propio CLI — ver docs.strapi.io/cms/testing.
// Se probó Vitest primero; su pipeline de módulos ESM/SSR no respeta el
// parche de require.cache que necesita tests/strapi-ts-patch.cjs, así que
// Strapi terminaba sin poder leer los config/*.ts. Con Jest (CommonJS real)
// el parche funciona como está documentado.
const config: Config = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/', '/.tmp/', '/.cache/', '/.strapi/', '/dist/', '/build/'],
  // Una sola instancia de Strapi por archivo, en serie: dos instancias en
  // paralelo pisarían la misma sqlite en memoria del proceso.
  maxWorkers: 1,
};

export default config;
