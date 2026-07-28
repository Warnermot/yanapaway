import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detenerBaseDePrueba, iniciarBaseDePrueba } from '../../../db/test-utils/base-datos-prueba';

let contenedor: StartedPostgreSqlContainer;

function crearContexto(query: string) {
  return { url: new URL(`http://localhost/api/instituciones/cercanas${query}`) };
}

describe('GET /api/instituciones/cercanas', () => {
  beforeAll(async () => {
    ({ contenedor } = await iniciarBaseDePrueba());

    const { db } = await import('../../../db/client');
    const { instituciones } = await import('../../../db/schema');
    await db.insert(instituciones).values({
      nombre: 'FELCV Sucre',
      tipo: 'felcv',
      latitud: -19.041,
      longitud: -65.251,
    });
  }, 60_000);

  afterAll(async () => {
    await detenerBaseDePrueba(contenedor);
  });

  it('responde 400 si faltan lat/lng', async () => {
    const { GET } = await import('./cercanas');

    const respuesta = await GET(crearContexto('') as never);

    expect(respuesta.status).toBe(400);
  });

  it('responde 400 si lat esta fuera de rango', async () => {
    const { GET } = await import('./cercanas');

    const respuesta = await GET(crearContexto('?lat=999&lng=0') as never);

    expect(respuesta.status).toBe(400);
  });

  it('responde 400 si lng esta fuera de rango', async () => {
    const { GET } = await import('./cercanas');

    const respuesta = await GET(crearContexto('?lat=0&lng=-200') as never);

    expect(respuesta.status).toBe(400);
  });

  it('responde 200 con coordenadas validas', async () => {
    const { GET } = await import('./cercanas');

    const respuesta = await GET(crearContexto('?lat=-19.04&lng=-65.25') as never);

    expect(respuesta.status).toBe(200);
    const datos = await respuesta.json();
    expect(datos.instituciones[0].nombre).toBe('FELCV Sucre');
    expect(typeof datos.instituciones[0].distanciaKm).toBe('number');
  });
});
