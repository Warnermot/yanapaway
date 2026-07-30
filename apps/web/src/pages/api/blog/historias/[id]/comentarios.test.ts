import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  detenerCmsDePrueba,
  iniciarCmsDePrueba,
  type ServidorCmsPrueba,
} from '../../../../../test-utils/servidor-cms-prueba';

const HISTORIA_UID = 'api::historia.historia' as const;

let servidor: ServidorCmsPrueba;
let idHistoriaPublicada: string;
let idHistoriaPendiente: string;
let ipDePrueba = 0;

function siguienteIp() {
  ipDePrueba += 1;
  return `10.2.0.${ipDePrueba}`;
}

function crearPeticion(cuerpo: unknown) {
  return new Request('http://localhost/api/blog/historias/x/comentarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

async function crearHistoriaDePrueba(publicada: boolean): Promise<string> {
  const documento = await servidor.strapi.documents(HISTORIA_UID).create({
    data: {
      contenido: '[DATOS DE PRUEBA] Salí de esa relación y hoy acompaño a otras.',
      categoria: 'recuperacion',
      alias: 'Marea Resiliente #4821',
    },
    ...(publicada ? { status: 'published' as const } : {}),
  });

  return documento.documentId;
}

describe('POST /api/blog/historias/[id]/comentarios', () => {
  beforeAll(async () => {
    servidor = await iniciarCmsDePrueba();
    idHistoriaPublicada = await crearHistoriaDePrueba(true);
    idHistoriaPendiente = await crearHistoriaDePrueba(false);
  }, 120_000);

  afterAll(async () => {
    await detenerCmsDePrueba(servidor);
  });

  it('acepta un mensaje de apoyo sobre una historia publicada', async () => {
    const { POST } = await import('./comentarios');

    const respuesta = await POST({
      request: crearPeticion({ contenido: 'No estás sola. Gracias por contarlo.' }),
      params: { id: idHistoriaPublicada },
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(201);
    const datos = await respuesta.json();
    expect(datos.alias).toMatch(/#\d{4}$/);
    expect(datos.pendienteDeRevision).toBe(true);
  });

  // Mismo criterio que las historias, y por la misma razón: el peor resultado
  // de este producto es una respuesta cruel visible bajo un testimonio.
  it('el mensaje NO aparece en la historia hasta que se apruebe', async () => {
    const { POST } = await import('./comentarios');
    const { listarComentarios } = await import('../../../../../lib/historias');

    const mensajeUnico = `Estoy contigo. Marca ${Date.now()}`;

    const respuesta = await POST({
      request: crearPeticion({ contenido: mensajeUnico }),
      params: { id: idHistoriaPublicada },
      clientAddress: siguienteIp(),
    } as never);
    expect(respuesta.status).toBe(201);

    const comentarios = await listarComentarios(idHistoriaPublicada);
    expect(comentarios.map((c) => c.contenido)).not.toContain(mensajeUnico);
  });

  it('el mensaje aparece una vez que un gestor lo publica', async () => {
    const { POST } = await import('./comentarios');
    const { listarComentarios } = await import('../../../../../lib/historias');

    const mensajeUnico = `Aprobado ${Date.now()}`;

    await POST({
      request: crearPeticion({ contenido: mensajeUnico }),
      params: { id: idHistoriaPublicada },
      clientAddress: siguienteIp(),
    } as never);

    const borradores = await servidor.strapi
      .documents('api::comentario-historia.comentario-historia')
      .findMany({ filters: { contenido: mensajeUnico }, status: 'draft' });
    expect(borradores).toHaveLength(1);

    await servidor.strapi
      .documents('api::comentario-historia.comentario-historia')
      .publish({ documentId: borradores[0].documentId });

    const comentarios = await listarComentarios(idHistoriaPublicada);
    expect(comentarios.map((c) => c.contenido)).toContain(mensajeUnico);
  });

  // Una historia pendiente de moderación no existe para el público: no se puede
  // comentar algo que todavía nadie aprobó.
  it('no permite comentar una historia que aún no fue aprobada', async () => {
    const { POST } = await import('./comentarios');

    const respuesta = await POST({
      request: crearPeticion({ contenido: 'Mensaje de apoyo' }),
      params: { id: idHistoriaPendiente },
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(404);
  });

  it('devuelve 404 para una historia inexistente con id bien formado', async () => {
    const { POST } = await import('./comentarios');

    const respuesta = await POST({
      request: crearPeticion({ contenido: 'Mensaje de apoyo' }),
      params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(404);
  });

  it('rechaza un id con formato inválido antes de consultar el CMS', async () => {
    const { POST } = await import('./comentarios');

    const respuesta = await POST({
      request: crearPeticion({ contenido: 'Mensaje de apoyo' }),
      params: { id: '$$$' },
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un mensaje vacío o solo con espacios', async () => {
    const { POST } = await import('./comentarios');

    const respuesta = await POST({
      request: crearPeticion({ contenido: '    \n\t  ' }),
      params: { id: idHistoriaPublicada },
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un mensaje más largo que el máximo', async () => {
    const { POST } = await import('./comentarios');

    const respuesta = await POST({
      request: crearPeticion({ contenido: 'a'.repeat(2001) }),
      params: { id: idHistoriaPublicada },
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('aplica el límite de mensajes por IP', async () => {
    const { POST } = await import('./comentarios');
    const ip = siguienteIp();

    const estados: number[] = [];
    for (let intento = 0; intento < 16; intento += 1) {
      const respuesta = await POST({
        request: crearPeticion({ contenido: `Mensaje de apoyo ${intento}` }),
        params: { id: idHistoriaPublicada },
        clientAddress: ip,
      } as never);
      estados.push(respuesta.status);
    }

    expect(estados.slice(0, 15).every((estado) => estado === 201)).toBe(true);
    expect(estados[15]).toBe(429);
  });
});
