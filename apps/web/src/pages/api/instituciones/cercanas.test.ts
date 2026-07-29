import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detenerCmsDePrueba, iniciarCmsDePrueba, type ServidorCmsPrueba } from '../../../test-utils/servidor-cms-prueba';

let servidor: ServidorCmsPrueba;

function crearContexto(query: string) {
  return { url: new URL(`http://localhost/api/instituciones/cercanas${query}`) };
}

describe('GET /api/instituciones/cercanas', () => {
  beforeAll(async () => {
    servidor = await iniciarCmsDePrueba();

    await servidor.strapi.documents('api::institucion.institucion').create({
      data: {
        nombre: 'FELCV Sucre',
        tipo: 'felcv',
        descripcion: 'Institución de prueba.',
        ciudad: 'Sucre',
        esEmergencia: false,
        activa: true,
        verificadoEn: new Date().toISOString().slice(0, 10),
        latitud: -19.041,
        longitud: -65.251,
        telefonos: [{ numero: '000-000-0000', esGratuito: false }],
      },
      status: 'published',
    });
  }, 120_000);

  afterAll(async () => {
    await detenerCmsDePrueba(servidor);
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
