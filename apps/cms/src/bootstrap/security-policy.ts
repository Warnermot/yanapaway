import type { Core } from '@strapi/strapi';

// El esquema de permisos de un CMS headless vive en base de datos, no en
// el código versionado: un despliegue limpio puede arrancar con una
// política de permisos incorrecta o inconsistente, y cualquiera con acceso
// al panel puede desarmarla sin querer. Esta rutina corre en CADA arranque
// (ver src/index.ts) y deja la política comprobable en vez de depender de
// que alguien la revise a mano.
//
// No hay usuarios finales en este sistema — el único acceso de lectura a
// la API es un token de solo lectura para el build del sitio Astro. Por
// eso el rol "public" y el rol "authenticated" (de usuarios finales, que
// no deberían existir) quedan sin ningún permiso de API habilitado.
const ROLE_TYPES = ['public', 'authenticated'] as const;

type PermissionLeaf = { enabled: boolean; [key: string]: unknown };

function isPermissionLeaf(node: unknown): node is PermissionLeaf {
  return typeof node === 'object' && node !== null && 'enabled' in (node as Record<string, unknown>);
}

/** Recorre el árbol de permisos (plugin -> controlador -> acción -> {enabled}) y apaga todo. Devuelve cuántos leafs cambiaron. */
function disableAllPermissions(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;

  if (isPermissionLeaf(node)) {
    if (node.enabled) {
      node.enabled = false;
      return 1;
    }
    return 0;
  }

  return Object.values(node as Record<string, unknown>).reduce(
    (total: number, value) => total + disableAllPermissions(value),
    0
  );
}

async function enforceRoleHasNoApiPermissions(strapi: Core.Strapi, roleType: (typeof ROLE_TYPES)[number]) {
  const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: roleType } });

  if (!role) {
    strapi.log.error(`[bootstrap] No se encontró el rol "${roleType}" de users-permissions. Revisar instalación.`);
    return;
  }

  const roleService = strapi.plugin('users-permissions').service('role');
  const roleWithPermissions = await roleService.findOne(role.id);
  const changed = disableAllPermissions(roleWithPermissions.permissions);

  if (changed > 0) {
    await roleService.updateRole(role.id, {
      name: roleWithPermissions.name,
      description: roleWithPermissions.description,
      permissions: roleWithPermissions.permissions,
    });
    strapi.log.warn(
      `[bootstrap] Corregido: ${changed} permiso(s) de API estaban habilitados en el rol "${roleType}" y se deshabilitaron. Este rol no debe tener ningún permiso de API.`
    );
  } else {
    strapi.log.info(`[bootstrap] OK: el rol "${roleType}" no tiene permisos de API habilitados.`);
  }
}

async function enforcePublicRegistrationDisabled(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' });
  const current = (await store.get()) as Record<string, unknown> | null;

  if (current?.allow_register !== false) {
    await store.set({ value: { ...current, allow_register: false } });
    strapi.log.warn('[bootstrap] Corregido: el registro público de usuarios estaba habilitado y se deshabilitó.');
  } else {
    strapi.log.info('[bootstrap] OK: el registro público de usuarios está deshabilitado.');
  }
}

async function warnIfEndUserAccountsExist(strapi: Core.Strapi) {
  const count = await strapi.query('plugin::users-permissions.user').count();

  if (count > 0) {
    strapi.log.error(
      `[bootstrap] Hay ${count} cuenta(s) en plugin::users-permissions.user. Este sistema no debería tener ninguna: no existen usuarios finales, solo gestores de contenido (cuentas de administrador).`
    );
  }
}

export async function enforceSecurityPolicy({ strapi }: { strapi: Core.Strapi }): Promise<void> {
  for (const roleType of ROLE_TYPES) {
    await enforceRoleHasNoApiPermissions(strapi, roleType);
  }

  await enforcePublicRegistrationDisabled(strapi);
  await warnIfEndUserAccountsExist(strapi);
}
