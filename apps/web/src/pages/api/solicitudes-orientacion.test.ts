import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detenerBaseDePrueba, iniciarBaseDePrueba } from '../../db/test-utils/base-datos-prueba';

let contenedor: StartedPostgreSqlContainer;
let ipDePrueba = 0;

function siguienteIp() {
  ipDePrueba += 1;
  return `10.0.0.${ipDePrueba}`;
}

function crearPeticion(cuerpo: unknown) {
  return new Request('http://localhost/api/solicitudes-orientacion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

describe('POST /api/solicitudes-orientacion', () => {
  beforeAll(async () => {
    ({ contenedor } = await iniciarBaseDePrueba());
  }, 60_000);

  afterAll(async () => {
    await detenerBaseDePrueba(contenedor);
  });

  it('crea una solicitud con datos validos', async () => {
    const { POST } = await import('./solicitudes-orientacion');

    const respuesta = await POST({
      request: crearPeticion({ mensaje: 'Necesito orientacion sobre un caso de grooming' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(201);
    const datos = await respuesta.json();
    expect(datos.solicitud.estado).toBe('pendiente');
  });

  it('rechaza cuando falta el mensaje', async () => {
    const { POST } = await import('./solicitudes-orientacion');

    const respuesta = await POST({
      request: crearPeticion({}),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un mensaje demasiado largo', async () => {
    const { POST } = await import('./solicitudes-orientacion');

    const respuesta = await POST({
      request: crearPeticion({ mensaje: 'a'.repeat(2001) }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un mensaje demasiado corto', async () => {
    const { POST } = await import('./solicitudes-orientacion');

    const respuesta = await POST({
      request: crearPeticion({ mensaje: 'hola' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un tipo de caso con formato invalido', async () => {
    const { POST } = await import('./solicitudes-orientacion');

    const respuesta = await POST({
      request: crearPeticion({ mensaje: 'Mensaje valido con longitud suficiente', tipoCasoId: 'no-es-uuid' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un tipo de caso con formato valido pero inexistente', async () => {
    const { POST } = await import('./solicitudes-orientacion');

    const respuesta = await POST({
      request: crearPeticion({
        mensaje: 'Mensaje valido con longitud suficiente',
        tipoCasoId: '00000000-0000-0000-0000-000000000000',
      }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('aplica el limite de solicitudes por IP', async () => {
    const { POST } = await import('./solicitudes-orientacion');
    const ip = siguienteIp();

    const respuestas = [];
    for (let intento = 0; intento < 6; intento += 1) {
      respuestas.push(
        await POST({
          request: crearPeticion({ mensaje: `Mensaje de prueba numero ${intento}, con longitud` }),
          clientAddress: ip,
        } as never),
      );
    }

    const estados = respuestas.map((r) => r.status);
    expect(estados.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(estados[5]).toBe(429);
  });
});
