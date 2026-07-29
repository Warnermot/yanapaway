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
const NOMBRE_TOKEN = 'Integración sitio (apps/web)';

const PERMISOS_LECTURA_DIRECTORIO = [
  'api::institucion.institucion.find',
  'api::institucion.institucion.findOne',
  'api::sede-institucion.sede-institucion.find',
  'api::sede-institucion.sede-institucion.findOne',
  'api::tipo-caso.tipo-caso.find',
  'api::tipo-caso.tipo-caso.findOne',
];

const PERMISOS_ESCRITURA_SOLICITUDES = ['api::solicitud-orientacion.solicitud-orientacion.create'];

export async function asegurarTokenIntegracionWeb({ strapi }: { strapi: Core.Strapi }): Promise<void> {
  if (!process.env.SEED_WEB_API_TOKEN) {
    strapi.log.info(
      `[bootstrap] SEED_WEB_API_TOKEN no está definido: no se crea automáticamente el token de integración. ` +
        `Crear uno manualmente en Settings → API Tokens (tipo Custom, sin expiración) con los permisos: ` +
        `${[...PERMISOS_LECTURA_DIRECTORIO, ...PERMISOS_ESCRITURA_SOLICITUDES].join(', ')}. ` +
        `Entregar el valor generado al equipo del sitio por un canal seguro (STRAPI_API_TOKEN en apps/web/.env).`
    );
    return;
  }

  const servicio = strapi.service('admin::api-token-content-api');
  const existente = await servicio.getByName(NOMBRE_TOKEN);

  if (existente) {
    strapi.log.info(`[bootstrap] OK: el token "${NOMBRE_TOKEN}" ya existe (id ${existente.id}).`);
    return;
  }

  const creado = await servicio.create({
    name: NOMBRE_TOKEN,
    description:
      'Único acceso de apps/web al directorio (lectura) y a solicitudes de orientación (creación). ' +
      'Creado automáticamente por SEED_WEB_API_TOKEN para dev/staging reproducibles.',
    type: 'custom',
    lifespan: null,
    permissions: [...PERMISOS_LECTURA_DIRECTORIO, ...PERMISOS_ESCRITURA_SOLICITUDES],
  });

  strapi.log.warn(
    `[bootstrap] Creado el token "${NOMBRE_TOKEN}". Copiar este valor UNA SOLA VEZ a apps/web/.env ` +
      `como STRAPI_API_TOKEN (no se vuelve a mostrar): ${creado.accessKey}`
  );
}
