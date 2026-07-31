import type { Core } from '@strapi/strapi';

// apps/web ahora es la fuente de verdad para instituciones/sedes/tipos de
// caso/solicitudes de orientación en Strapi (decisión explícita: reemplaza
// al modelo Drizzle+Postgres que tenía antes). El rol "public" queda sin
// ningún permiso de API por diseño (ver bootstrap/security-policy.ts), así
// que el sitio necesita su propio token — de tipo "custom", no
// "read-only" — con exactamente los permisos que usa: leer el directorio y
// crear solicitudes de orientación.
//
// Strapi no deja fijar el valor de un token nuevo (siempre genera uno
// aleatorio); por eso, si SEED_WEB_API_TOKEN está definido, este bootstrap
// crea el token la PRIMERA vez y loguea el valor generado una única vez para
// copiarlo a apps/web/.env como STRAPI_API_TOKEN. En arranques posteriores
// el token ya existe y no se vuelve a loguear ningún secreto.
//
// Los PERMISOS de abajo sí se reconcilian en cada arranque, con el mismo
// criterio que bootstrap/security-policy.ts aplica a los roles: la lista de
// este archivo es la fuente de verdad. Agregar un permiso acá alcanza para que
// un token ya creado lo reciba en el próximo arranque, sin rotar su valor ni
// tocar el panel — y un permiso agregado a mano en el panel se retira. Sin
// esto, sumar un content-type nuevo dejaba al sitio con un 401 silencioso.
const NOMBRE_TOKEN = 'Integración sitio (apps/web)';

const PERMISOS_LECTURA_PUBLICA = [
  'api::institucion.institucion.find',
  'api::institucion.institucion.findOne',
  'api::sede-institucion.sede-institucion.find',
  'api::sede-institucion.sede-institucion.findOne',
  'api::tipo-caso.tipo-caso.find',
  'api::tipo-caso.tipo-caso.findOne',
  // Páginas de recursos: alimentan /recursos y /recursos/{slug} en el sitio.
  'api::pagina.pagina.find',
  'api::pagina.pagina.findOne',
  'api::categoria-recurso.categoria-recurso.find',
  'api::categoria-recurso.categoria-recurso.findOne',
];

const PERMISOS_ESCRITURA_SOLICITUDES = ['api::solicitud-orientacion.solicitud-orientacion.create'];

// Subproducto /blog: el sitio lee lo que ya está publicado y crea borradores.
// No lleva `update`, `delete` ni forma alguna de publicar — aprobar un
// testimonio o un mensaje de apoyo es una acción de una persona en el panel
// (ver middlewares/blog-moderacion.ts, que además lo bloquea en el backend).
const PERMISOS_BLOG = [
  'api::historia.historia.find',
  'api::historia.historia.findOne',
  'api::historia.historia.create',
  'api::comentario-historia.comentario-historia.find',
  'api::comentario-historia.comentario-historia.create',
];

const PERMISOS_ESPERADOS = [
  ...PERMISOS_LECTURA_PUBLICA,
  ...PERMISOS_ESCRITURA_SOLICITUDES,
  ...PERMISOS_BLOG,
];

// `getByName` devuelve `permissions` como arreglo de strings (las acciones ya
// aplanadas), aunque en la base sean filas de `admin::permission` con campo
// `action`. Se acepta cualquiera de las dos formas para no depender de ese
// detalle interno de Strapi.
type PermisoToken = string | { action: string };
type TokenExistente = { id: number; permissions?: PermisoToken[] | null };

function accionDe(permiso: PermisoToken): string {
  return typeof permiso === 'string' ? permiso : permiso.action;
}

// `strapi.service()` devuelve un tipo genérico que no describe el servicio de
// tokens del admin (no expone getByName/create/update), así que se declara acá
// la porción que se usa. Ver @strapi/admin/src/services/api-token.ts.
type ServicioTokens = {
  getByName: (name: string) => Promise<TokenExistente | null>;
  create: (attributes: Record<string, unknown>) => Promise<{ accessKey: string }>;
  update: (id: number, attributes: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Deja los permisos del token exactamente iguales a PERMISOS_ESPERADOS.
 * `update` del servicio de Strapi hace el diff (crea los que faltan y borra los
 * que sobran) y no rota el accessKey, así que el valor que ya vive en
 * apps/web/.env sigue siendo válido.
 */
async function reconciliarPermisos({
  strapi,
  servicio,
  token,
}: {
  strapi: Core.Strapi;
  servicio: ServicioTokens;
  token: TokenExistente;
}): Promise<void> {
  const actuales = (token.permissions ?? []).map(accionDe).filter(Boolean);
  const faltantes = PERMISOS_ESPERADOS.filter((permiso) => !actuales.includes(permiso));
  const sobrantes = actuales.filter((permiso) => !PERMISOS_ESPERADOS.includes(permiso));

  if (faltantes.length === 0 && sobrantes.length === 0) {
    strapi.log.info(
      `[bootstrap] OK: el token "${NOMBRE_TOKEN}" ya existe (id ${token.id}) con los permisos esperados.`
    );
    return;
  }

  await servicio.update(token.id, { permissions: PERMISOS_ESPERADOS });

  const detalle = [
    faltantes.length > 0 ? `agregados: ${faltantes.join(', ')}` : null,
    sobrantes.length > 0 ? `retirados: ${sobrantes.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  strapi.log.warn(
    `[bootstrap] Corregidos los permisos del token "${NOMBRE_TOKEN}" (id ${token.id}) — ${detalle}. ` +
      `El valor del token NO cambió: no hace falta actualizar apps/web/.env.`
  );
}

export async function asegurarTokenIntegracionWeb({ strapi }: { strapi: Core.Strapi }): Promise<void> {
  if (!process.env.SEED_WEB_API_TOKEN) {
    strapi.log.info(
      `[bootstrap] SEED_WEB_API_TOKEN no está definido: no se crea automáticamente el token de integración. ` +
        `Crear uno manualmente en Settings → API Tokens (tipo Custom, sin expiración) con los permisos: ` +
        `${PERMISOS_ESPERADOS.join(', ')}. ` +
        `Entregar el valor generado al equipo del sitio por un canal seguro (STRAPI_API_TOKEN en apps/web/.env).`
    );
    return;
  }

  const servicio = strapi.service('admin::api-token-content-api') as unknown as ServicioTokens;
  const existente = await servicio.getByName(NOMBRE_TOKEN);

  if (existente) {
    await reconciliarPermisos({ strapi, servicio, token: existente });
    return;
  }

  const creado = await servicio.create({
    name: NOMBRE_TOKEN,
    description:
      'Único acceso de apps/web al directorio y a las páginas de recursos (lectura), a ' +
      'solicitudes de orientación (creación) y al blog de historias (lectura de lo publicado ' +
      'y creación de borradores pendientes de moderación). ' +
      'Creado automáticamente por SEED_WEB_API_TOKEN para dev/staging reproducibles.',
    type: 'custom',
    lifespan: null,
    permissions: PERMISOS_ESPERADOS,
  });

  strapi.log.warn(
    `[bootstrap] Creado el token "${NOMBRE_TOKEN}". Copiar este valor UNA SOLA VEZ a apps/web/.env ` +
      `como STRAPI_API_TOKEN (no se vuelve a mostrar): ${creado.accessKey}`
  );
}
