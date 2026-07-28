import 'dotenv/config';

// Strapi es la fuente de verdad para el directorio institucional (decisión
// explícita: reemplaza al modelo Drizzle+Postgres que este módulo tenía
// antes). El rol "public" de Strapi queda sin ningún permiso de API por
// diseño (ver apps/cms/src/bootstrap/security-policy.ts), así que todo
// acceso pasa por un token de tipo "custom" — ver
// apps/cms/src/bootstrap/token-integracion-web.ts para cómo se genera.
const STRAPI_URL = (process.env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/+$/, '');
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export class ErrorStrapi extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorStrapi';
  }
}

async function strapiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!STRAPI_API_TOKEN) {
    throw new Error('Falta STRAPI_API_TOKEN en el entorno: ver apps/web/.env.example.');
  }

  const respuesta = await fetch(`${STRAPI_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    throw new ErrorStrapi(respuesta.status, `Strapi respondió ${respuesta.status} en ${path}: ${cuerpo}`);
  }

  return (await respuesta.json()) as T;
}

export function strapiGet<T>(path: string): Promise<T> {
  return strapiFetch<T>(path);
}

export function strapiPost<T>(path: string, data: unknown): Promise<T> {
  return strapiFetch<T>(path, { method: 'POST', body: JSON.stringify({ data }) });
}

export type StrapiListado<T> = { data: T[]; meta: unknown };
export type StrapiItem<T> = { data: T; meta: unknown };
