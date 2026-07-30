import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detenerCmsDePrueba, iniciarCmsDePrueba, type ServidorCmsPrueba } from '../../../test-utils/servidor-cms-prueba';

let servidor: ServidorCmsPrueba;
let ipDePrueba = 0;

function siguienteIp() {
  ipDePrueba += 1;
  return `10.1.0.${ipDePrueba}`;
}

// Por defecto se firma como anónima: los casos que prueban otra cosa (largo,
// categoría, rate limit) no deberían tener que decidir sobre la firma. Los
// tests que sí prueban la firma la pasan explícitamente.
function crearPeticion(cuerpo: Record<string, unknown>) {
  return new Request('http://localhost/api/blog/historias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonima: true, ...cuerpo }),
  });
}

const TESTIMONIO = 'Salí de esa relación hace dos años y hoy estoy mucho mejor.';

describe('POST /api/blog/historias', () => {
  beforeAll(async () => {
    servidor = await iniciarCmsDePrueba();
  }, 120_000);

  afterAll(async () => {
    await detenerCmsDePrueba(servidor);
  });

  it('acepta una historia firmada con el nombre que eligió quien la envía', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({
        contenido: TESTIMONIO,
        categoria: 'recuperacion',
        nombre: 'Rosa',
        anonima: false,
      }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(201);
    const datos = await respuesta.json();
    expect(datos.alias).toBe('Rosa');
    expect(datos.pendienteDeRevision).toBe(true);
  });

  it('acepta una historia anónima y la firma como Anónima', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ contenido: TESTIMONIO, categoria: 'recuperacion', anonima: true }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(201);
    const datos = await respuesta.json();
    expect(datos.alias).toBe('Anónima');
  });

  // Anónima significa que en el CMS no queda ningún nombre guardado, no que se
  // guarde la palabra "Anónima": si quedara un dato, habría algo que filtrar.
  it('una historia anónima se guarda SIN alias en el CMS', async () => {
    const { POST } = await import('./historias');

    const contenidoUnico = `${TESTIMONIO} Sin firma ${Date.now()}`;

    await POST({
      request: crearPeticion({ contenido: contenidoUnico, categoria: 'general', anonima: true }),
      clientAddress: siguienteIp(),
    } as never);

    const [guardada] = await servidor.strapi.documents('api::historia.historia').findMany({
      filters: { contenido: contenidoUnico },
      status: 'draft',
    });

    expect(guardada).toBeDefined();
    expect(guardada.alias ?? null).toBeNull();
  });

  it('rechaza el envío si no se eligió nombre ni se marcó anónima', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ contenido: TESTIMONIO, categoria: 'general', anonima: false, nombre: '' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un nombre con datos de contacto', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({
        contenido: TESTIMONIO,
        categoria: 'general',
        anonima: false,
        nombre: 'rosa@correo.com',
      }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  // La prueba central del subproducto: sin login, lo único que impide que
  // aparezca información falsa u ofensiva es que nada sea visible antes de que
  // una persona lo apruebe. Si este test falla, /blog no debería salir a
  // producción.
  it('la historia enviada NO aparece en el listado público hasta que se apruebe', async () => {
    const { POST } = await import('./historias');
    const { listarHistorias } = await import('../../../lib/historias');

    const contenidoUnico = `${TESTIMONIO} Marca de prueba ${Date.now()}`;

    const respuesta = await POST({
      request: crearPeticion({ contenido: contenidoUnico, categoria: 'general' }),
      clientAddress: siguienteIp(),
    } as never);
    expect(respuesta.status).toBe(201);

    const { historias } = await listarHistorias(1);
    expect(historias.map((h) => h.contenido)).not.toContain(contenidoUnico);
  });

  it('la historia aparece en el listado una vez que un gestor la publica', async () => {
    const { POST } = await import('./historias');
    const { listarHistorias } = await import('../../../lib/historias');

    const contenidoUnico = `${TESTIMONIO} Aprobada ${Date.now()}`;

    await POST({
      request: crearPeticion({ contenido: contenidoUnico, categoria: 'general' }),
      clientAddress: siguienteIp(),
    } as never);

    // Publicar por el document service es el camino del panel de administración.
    const borradores = await servidor.strapi.documents('api::historia.historia').findMany({
      filters: { contenido: contenidoUnico },
      status: 'draft',
    });
    expect(borradores).toHaveLength(1);

    await servidor.strapi
      .documents('api::historia.historia')
      .publish({ documentId: borradores[0].documentId });

    const { historias } = await listarHistorias(1);
    expect(historias.map((h) => h.contenido)).toContain(contenidoUnico);
  });

  it('rechaza una historia más corta que el mínimo', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ contenido: 'muy corta', categoria: 'general' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza una historia más larga que el máximo', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ contenido: 'a'.repeat(8001), categoria: 'general' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  // El contenido se normaliza ANTES de medirlo: al revés, esto pasaría el
  // mínimo de 20 y se guardaría una historia en blanco.
  it('rechaza una historia que solo tiene espacios y saltos de línea', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ contenido: '   \n\n\n\t     \r\n        ', categoria: 'general' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza el envío cuando falta el contenido', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ categoria: 'general' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  // El prototipo silenciaba una categoría desconocida a 'general'. Acá se
  // rechaza: guardar un testimonio en el cajón equivocado esconde un bug.
  it('rechaza una categoría que no está en la lista, en lugar de caer a general', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ contenido: TESTIMONIO, categoria: 'inventada' }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('rechaza el envío cuando falta la categoría', async () => {
    const { POST } = await import('./historias');

    const respuesta = await POST({
      request: crearPeticion({ contenido: TESTIMONIO }),
      clientAddress: siguienteIp(),
    } as never);

    expect(respuesta.status).toBe(400);
  });

  it('aplica el límite de envíos por IP', async () => {
    const { POST } = await import('./historias');
    const ip = siguienteIp();

    const estados: number[] = [];
    for (let intento = 0; intento < 6; intento += 1) {
      const respuesta = await POST({
        request: crearPeticion({ contenido: `${TESTIMONIO} Intento ${intento}.`, categoria: 'general' }),
        clientAddress: ip,
      } as never);
      estados.push(respuesta.status);
    }

    expect(estados.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(estados[5]).toBe(429);
  });
});
