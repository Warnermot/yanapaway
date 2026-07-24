// Parchea el loader de configuración de Strapi para que soporte
// config/*.ts fuera del CLI (`strapi develop`/`strapi start`), que es el
// único lugar que normalmente registra un compilador de TypeScript antes
// de leer la config. Acá arrancamos Strapi "a mano" vía createStrapi().load()
// para poder testear con vitest+supertest, así que hay que registrar ese
// mismo soporte de TS nosotros. Copiado (con comentarios traducidos) de la
// guía oficial: https://docs.strapi.io/cms/testing
//
// Requerido por tests/helpers/strapi.ts ANTES de importar @strapi/strapi.
try {
  require('ts-node/register/transpile-only');
} catch (err) {
  require('@strapi/typescript-utils/register');
}

const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const strapiCoreRoot = path.dirname(require.resolve('@strapi/core/package.json'));
const loadConfigFilePath = path.join(strapiCoreRoot, 'dist', 'utils', 'load-config-file.js');
const loadConfigFileModule = require(loadConfigFilePath);
const { compilerOptions: baseCompilerOptions } = require('./ts-compiler-options.cjs');

// ============================================
// 1. PARCHE: loader de archivos de config .ts
// ============================================
// Sin esto, Strapi solo carga config/*.js y config/*.json.
if (!loadConfigFileModule.loadConfigFile.__tsRuntimePatched) {
  const strapiUtils = require('@strapi/utils');
  const originalLoadConfigFile = loadConfigFileModule.loadConfigFile;

  const loadTypeScriptConfig = (file) => {
    const source = fs.readFileSync(file, 'utf8');
    const options = {
      ...baseCompilerOptions,
      module: ts.ModuleKind.CommonJS,
    };

    const output = ts.transpileModule(source, {
      compilerOptions: options,
      fileName: file,
      reportDiagnostics: false,
    });

    const moduleInstance = new Module(file);
    moduleInstance.filename = file;
    moduleInstance.paths = Module._nodeModulePaths(path.dirname(file));
    moduleInstance._compile(output.outputText, file);

    const exported = moduleInstance.exports;
    const resolved = exported && exported.__esModule ? exported.default : exported;

    if (typeof resolved === 'function') {
      return resolved({ env: strapiUtils.env });
    }

    return resolved;
  };

  const patchedLoadConfigFile = (file) => {
    const extension = path.extname(file).toLowerCase();

    if (extension === '.ts' || extension === '.cts' || extension === '.mts') {
      return loadTypeScriptConfig(file);
    }

    return originalLoadConfigFile(file);
  };

  patchedLoadConfigFile.__tsRuntimePatched = true;
  loadConfigFileModule.loadConfigFile = patchedLoadConfigFile;
  require.cache[loadConfigFilePath].exports = loadConfigFileModule;
}

// ============================================
// 2. PARCHE: scanner del directorio config/
// ============================================
// Sin esto, Strapi ni siquiera intenta listar archivos .ts dentro de
// config/ (incluye config/env/test/database.ts).
const configLoaderPath = path.join(strapiCoreRoot, 'dist', 'configuration', 'config-loader.js');
const originalLoadConfigDir = require(configLoaderPath);
const validExtensions = ['.js', '.json', '.ts', '.cts', '.mts'];
const mistakenFilenames = {
  middleware: 'middlewares',
  plugin: 'plugins',
};
const restrictedFilenames = [
  'uuid',
  'hosting',
  'license',
  'enforce',
  'disable',
  'enable',
  'telemetry',
  'strapi',
  'internal',
  'launchedAt',
  'serveAdminPanel',
  'autoReload',
  'environment',
  'packageJsonStrapi',
  'info',
  'dirs',
  ...Object.keys(mistakenFilenames),
];
const strapiConfigFilenames = ['admin', 'server', 'api', 'database', 'middlewares', 'plugins', 'features'];

if (!originalLoadConfigDir.__tsRuntimePatched) {
  const patchedLoadConfigDir = (dir) => {
    if (!fs.existsSync(dir)) {
      return {};
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const seenFilenames = new Set();

    const configFiles = entries.reduce((acc, entry) => {
      if (!entry.isFile()) {
        return acc;
      }

      const extension = path.extname(entry.name);
      const extensionLower = extension.toLowerCase();
      const baseName = path.basename(entry.name, extension);
      const baseNameLower = baseName.toLowerCase();

      if (!validExtensions.includes(extensionLower)) {
        console.warn(`Config file not loaded, extension must be one of ${validExtensions.join(',')}): ${entry.name}`);
        return acc;
      }

      if (restrictedFilenames.includes(baseNameLower)) {
        console.warn(`Config file not loaded, restricted filename: ${entry.name}`);
        if (baseNameLower in mistakenFilenames) {
          console.log(`Did you mean ${mistakenFilenames[baseNameLower]}?`);
        }
        return acc;
      }

      const restrictedPrefix = [...restrictedFilenames, ...strapiConfigFilenames].find(
        (restrictedName) => restrictedName.startsWith(baseNameLower) && restrictedName !== baseNameLower
      );

      if (restrictedPrefix) {
        console.warn(`Config file not loaded, filename cannot start with ${restrictedPrefix}: ${entry.name}`);
        return acc;
      }

      if (seenFilenames.has(baseNameLower)) {
        console.warn(`Config file not loaded, case-insensitive name matches other config file: ${entry.name}`);
        return acc;
      }

      seenFilenames.add(baseNameLower);
      acc.push(entry);
      return acc;
    }, []);

    return configFiles.reduce((acc, entry) => {
      const extension = path.extname(entry.name);
      const key = path.basename(entry.name, extension);
      const filePath = path.resolve(dir, entry.name);

      acc[key] = loadConfigFileModule.loadConfigFile(filePath);
      return acc;
    }, {});
  };

  patchedLoadConfigDir.__tsRuntimePatched = true;
  require.cache[configLoaderPath].exports = patchedLoadConfigDir;
}

module.exports = {};
