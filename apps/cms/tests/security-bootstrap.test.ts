import { setupStrapi, cleanupStrapi } from './helpers/strapi';
import { enforceSecurityPolicy } from '../src/bootstrap/security-policy';

// El esquema de permisos de Strapi vive en base de datos, no en el repo.
// Un despliegue limpio puede arrancar con permisos incorrectos, y alguien
// puede desarmarlos sin querer desde el panel. `enforceSecurityPolicy`
// corre en cada arranque (ver src/index.ts) y deja esto comprobable en
// vez de ser un ajuste manual que alguien puede deshacer sin querer.
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

/** Pone en `true` el primer leaf `{ enabled }` que encuentra, sin asumir la forma exacta del árbol. */
function enableFirstLeaf(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;

  if ('enabled' in record) {
    record.enabled = true;
    return true;
  }

  return Object.values(record).some((value) => enableFirstLeaf(value));
}

async function getPermissionTree(roleId: number) {
  const roleService = strapi.plugin('users-permissions').service('role');
  const { permissions } = await roleService.findOne(roleId);
  return permissions as unknown;
}

describe('Bootstrap de seguridad', () => {
  beforeAll(async () => {
    await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi();
  });

  it('deja el rol public sin ningún permiso de API habilitado', async () => {
    const role = await getRoleByType('public');
    const tree = await getPermissionTree(role.id);
    expect(collectEnabledLeaves(tree)).toEqual([]);
  });

  it('deja el rol authenticated sin ningún permiso de API habilitado', async () => {
    const role = await getRoleByType('authenticated');
    const tree = await getPermissionTree(role.id);
    expect(collectEnabledLeaves(tree)).toEqual([]);
  });

  it('deshabilita el registro público de usuarios', async () => {
    const advanced = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();
    expect((advanced as { allow_register: boolean }).allow_register).toBe(false);
  });

  it('si alguien reactiva un permiso a mano, el próximo arranque lo corrige y lo deja en el log', async () => {
    const roleService = strapi.plugin('users-permissions').service('role');
    const publicRole = await getRoleByType('public');
    const { permissions } = await roleService.findOne(publicRole.id);

    const flipped = enableFirstLeaf(permissions);
    expect(flipped).toBe(true);

    await roleService.updateRole(publicRole.id, { permissions });

    const warnSpy = jest.spyOn(strapi.log, 'warn');

    await enforceSecurityPolicy({ strapi });

    const treeAfter = await getPermissionTree(publicRole.id);
    expect(collectEnabledLeaves(treeAfter)).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
