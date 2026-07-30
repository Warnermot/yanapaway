import { setupStrapi, cleanupStrapi } from './helpers/strapi';
import { enforceSecurityPolicy, PUBLIC_PERMISSIONS } from '../src/bootstrap/security-policy';

// El esquema de permisos de Strapi vive en base de datos, no en el repo.
// Un despliegue limpio puede arrancar con permisos incorrectos, y alguien
// puede desarmarlos sin querer desde el panel. `enforceSecurityPolicy`
// corre en cada arranque (ver src/index.ts) y deja esto comprobable en
// vez de ser un ajuste manual que alguien puede deshacer sin querer.
//
// Este archivo es el espejo de la política: el rol "public" debe tener
// habilitados EXACTAMENTE los permisos de PUBLIC_PERMISSIONS (el diario
// personal y la lectura de etiquetas), ni uno más ni uno menos, y el rol
// "authenticated" no debe tener ningún permiso de API.
async function getRoleByType(type: 'public' | 'authenticated') {
  return strapi.query('plugin::users-permissions.role').findOne({ where: { type } });
}

function collectEnabledLeaves(node: unknown, path: string[] = []): string[] {
  if (!node || typeof node !== 'object') return [];
  const record = node as Record<string, unknown>;

  if ('enabled' in record) {
    return record.enabled === true ? [path.join('.')] : [];
  }

  return Object.entries(record).flatMap(([key, value]) => collectEnabledLeaves(value, [...path, key]));
}

// El árbol del role service usa "<scope>.controllers.<controlador>.<accion>",
// mientras la política declara los permisos como "<scope>.<controlador>.<accion>"
// (el formato que guarda la tabla de permisos). Normalizar acá deja la
// constante de la política como única fuente de verdad.
function toActionId(leafPath: string): string {
  return leafPath.replace('.controllers.', '.');
}

async function getPermissionTree(roleId: number) {
  const roleService = strapi.plugin('users-permissions').service('role');
  const { permissions } = await roleService.findOne(roleId);
  return permissions as unknown;
}

async function getEnabledActions(type: 'public' | 'authenticated'): Promise<string[]> {
  const role = await getRoleByType(type);
  const tree = await getPermissionTree(role.id);
  return collectEnabledLeaves(tree).map(toActionId);
}

/**
 * Habilita el primer leaf `{ enabled }` que NO esté permitido por la política,
 * para que la corrección sea observable de verdad: habilitar uno que ya debe
 * estar activo no cambiaría nada y el test pasaría en falso. Devuelve el id de
 * la acción habilitada, o null si no encontró ninguna.
 */
function enableFirstDisallowedLeaf(node: unknown, path: string[] = []): string | null {
  if (!node || typeof node !== 'object') return null;
  const record = node as Record<string, unknown>;

  if ('enabled' in record) {
    const actionId = toActionId(path.join('.'));
    if (record.enabled === true || PUBLIC_PERMISSIONS.includes(actionId)) return null;
    record.enabled = true;
    return actionId;
  }

  for (const [key, value] of Object.entries(record)) {
    const found = enableFirstDisallowedLeaf(value, [...path, key]);
    if (found) return found;
  }

  return null;
}

describe('Bootstrap de seguridad', () => {
  beforeAll(async () => {
    await setupStrapi();
  }, 60000);

  afterAll(async () => {
    await cleanupStrapi();
  });

  it('deja el rol public con exactamente los permisos declarados en la política', async () => {
    expect((await getEnabledActions('public')).sort()).toEqual([...PUBLIC_PERMISSIONS].sort());
  });

  it('deja el rol authenticated sin ningún permiso de API', async () => {
    const enabled = await getEnabledActions('authenticated');
    expect(enabled.filter((action) => action.startsWith('api::'))).toEqual([]);
  });

  it('deshabilita el registro público de usuarios', async () => {
    const advanced = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();
    expect((advanced as { allow_register: boolean }).allow_register).toBe(false);
  });

  it('si alguien habilita un permiso de más a mano, el próximo arranque lo corrige y lo deja en el log', async () => {
    const roleService = strapi.plugin('users-permissions').service('role');
    const publicRole = await getRoleByType('public');
    const { permissions } = await roleService.findOne(publicRole.id);

    const habilitado = enableFirstDisallowedLeaf(permissions);
    expect(habilitado).not.toBeNull();

    await roleService.updateRole(publicRole.id, { permissions });
    expect(await getEnabledActions('public')).toContain(habilitado);

    const warnSpy = jest.spyOn(strapi.log, 'warn');

    await enforceSecurityPolicy({ strapi });

    expect((await getEnabledActions('public')).sort()).toEqual([...PUBLIC_PERMISSIONS].sort());
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
