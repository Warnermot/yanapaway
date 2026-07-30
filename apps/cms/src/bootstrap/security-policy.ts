import type { Core } from '@strapi/strapi';

// El esquema de permisos de un CMS headless vive en base de datos, no en
// el código versionado: un despliegue limpio puede arrancar con una
// política de permisos incorrecta o inconsistente, y cualquiera con acceso
// al panel puede desarmarla sin querer. Esta rutina corre en CADA arranque
// (ver src/index.ts) y deja la política comprobable en vez de depender de
// que alguien la revise a mano.
//
// El rol "public" (sin autenticación) puede operar el diario personal y
// leer las etiquetas disponibles — estos endpoints son el núcleo de la app.
// El rol "authenticated" (usuarios de users-permissions, que no deberían
// existir en este sistema) queda sin ningún permiso.

// Permisos que el rol "public" debe tener habilitados.
// Formato: "plugin::controller.action"
export const PUBLIC_PERMISSIONS: string[] = [
  'api::entrada-diario.entrada-diario.find',
  'api::entrada-diario.entrada-diario.findOne',
  'api::entrada-diario.entrada-diario.create',
  'api::entrada-diario.entrada-diario.update',
  'api::entrada-diario.entrada-diario.delete',
  'api::etiqueta-diario.etiqueta-diario.find',
  'api::etiqueta-diario.etiqueta-diario.findOne',
];

async function enforcePublicPermissions(strapi: Core.Strapi): Promise<void> {
  const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });

  if (!role) {
    strapi.log.error('[bootstrap] No se encontró el rol "public". Revisar instalación.');
    return;
  }

  const permissionQuery = strapi.query('plugin::users-permissions.permission');

  // Obtener permisos actuales del rol "public"
  const currentPermissions = await permissionQuery.findMany({
    where: { role: role.id },
  });

  const currentActionSet = new Set<string>(
    currentPermissions.map((p: { action: string }) => p.action)
  );

  let enabled = 0;
  let disabled = 0;

  // 1. Habilitar / crear los permisos que deben estar activos
  for (const action of PUBLIC_PERMISSIONS) {
    if (currentActionSet.has(action)) {
      // Ya existe: asegurarse de que esté enabled (Strapi v5 usa un campo "enabled" en algunos builds)
      const perm = currentPermissions.find((p: { action: string }) => p.action === action);
      if (perm && (perm as { enabled?: boolean }).enabled === false) {
        await permissionQuery.update({ where: { id: perm.id }, data: { enabled: true } });
        enabled++;
      }
      // Si no tiene campo enabled, la presencia del registro ya implica habilitado
    } else {
      // No existe: crearlo
      await permissionQuery.create({ data: { action, role: role.id } });
      enabled++;
    }
  }

  // 2. Deshabilitar / eliminar cualquier otro permiso que el rol "public" tenga de más
  for (const perm of currentPermissions) {
    const p = perm as { id: number; action: string };
    if (!PUBLIC_PERMISSIONS.includes(p.action)) {
      await permissionQuery.delete({ where: { id: p.id } });
      disabled++;
    }
  }

  if (enabled > 0 || disabled > 0) {
    strapi.log.warn(
      `[bootstrap] Permisos del rol "public" actualizados: ${enabled} habilitado(s), ${disabled} eliminado(s).`
    );
  } else {
    strapi.log.info('[bootstrap] OK: los permisos del rol "public" ya están correctamente configurados.');
  }
}

async function enforceAuthenticatedNoPermissions(strapi: Core.Strapi): Promise<void> {
  const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });

  if (!role) {
    strapi.log.error('[bootstrap] No se encontró el rol "authenticated". Revisar instalación.');
    return;
  }

  const permissionQuery = strapi.query('plugin::users-permissions.permission');
  const currentPermissions = await permissionQuery.findMany({ where: { role: role.id } });

  // Este rol no debe tener ningún permiso de API
  const apiPerms = (currentPermissions as { id: number; action: string }[]).filter((p) =>
    p.action.startsWith('api::')
  );

  if (apiPerms.length > 0) {
    for (const perm of apiPerms) {
      await permissionQuery.delete({ where: { id: perm.id } });
    }
    strapi.log.warn(
      `[bootstrap] Corregido: ${apiPerms.length} permiso(s) de API eliminados del rol "authenticated".`
    );
  } else {
    strapi.log.info('[bootstrap] OK: el rol "authenticated" no tiene permisos de API.');
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
  await enforcePublicPermissions(strapi);
  await enforceAuthenticatedNoPermissions(strapi);
  await enforcePublicRegistrationDisabled(strapi);
  await warnIfEndUserAccountsExist(strapi);
}
