// Opciones de compilación TS usadas por strapi-ts-patch.cjs para transpilar
// los config/*.ts de Strapi a mano cuando se arranca fuera del CLI de
// `strapi develop` (que normalmente registra su propio loader de TS).
// Ver docs.strapi.io/cms/testing.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

const baseCompilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2019,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  esModuleInterop: true,
  jsx: ts.JsxEmit.React,
};

const loadCompilerOptions = () => {
  let options = { ...baseCompilerOptions };

  if (!fs.existsSync(tsconfigPath)) {
    return options;
  }

  try {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const parsed = ts.parseConfigFileTextToJson(tsconfigPath, tsconfigContent);

    if (!parsed.error && parsed.config && parsed.config.compilerOptions) {
      options = {
        ...options,
        ...parsed.config.compilerOptions,
      };
    }
  } catch (error) {
    // Ignorar errores de parseo del tsconfig y usar los defaults.
  }

  return options;
};

module.exports = {
  compilerOptions: loadCompilerOptions(),
  loadCompilerOptions,
};
