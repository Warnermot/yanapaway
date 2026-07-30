import request from 'supertest';
import { setupStrapi, cleanupStrapi } from './helpers/strapi';

const HISTORIA_UID = 'api::historia.historia' as const;

// /blog no tiene login: quien publica es anónima y no hay nada que verificar
// sobre ella. La única barrera real contra información falsa u ofensiva es que
// una persona apruebe el contenido antes de que sea visible, y esa barrera se
// apoya en Draft & Publish.
//
// Que "crear por API deja un borrador" sea el DEFAULT de Strapi no alcanza: un
// default cambia en una versión menor y nadie se entera hasta que un testimonio
// falso aparece publicado. src/middlewares/blog-moderacion.ts lo convierte en
// invariante, y este archivo lo prueba por HTTP real — el mismo camino que usa
// el sitio.
//
// El token de prueba recibe A PROPÓSITO más permisos de los que el sitio tiene
// (update, delete): así se comprueba que el bloqueo vive en el backend y no
// depende solo de que la lista de permisos esté bien.
const PERMISOS_AMPLIOS = [
  'api::historia.historia.find',
  'api::historia.historia.findOne',
  'api::historia.historia.create',
  'api::historia.historia.update',
  'api::historia.historia.delete',
];

let accessKey: string;

function historiaValida(overrides: { alias?: string } = {}) {
  return {
    contenido: '[DATOS DE PRUEBA] Salí de esa relación hace dos años y hoy estoy mejor.',
    categoria: 'recuperacion' as const,
    alias: 'Marea Resiliente #4821',
    ...overrides,
  };
}

function api() {
  return request(strapi.server.httpServer);
}

function autorizado(peticion: request.Test) {
  return peticion.set('Authorization', `Bearer ${accessKey}`);
}

describe('Moderación del blog (/blog)', () => {
  beforeAll(async () => {
    await setupStrapi();

    const servicio = strapi.service('admin::api-token-content-api') as unknown as {
      create: (attrs: Record<string, unknown>) => Promise<{ accessKey: string }>;
    };

    const token = await servicio.create({
      name: 'Token de prueba blog-moderacion',
      description: 'Creado por tests/blog-moderacion.test.ts',
      type: 'custom',
      lifespan: null,
      permissions: PERMISOS_AMPLIOS,
    });

    accessKey = token.accessKey;
  }, 60000);

  afterAll(async () => {
    await cleanupStrapi();
  });

  it('crear una historia por la Content API la deja en borrador, no publicada', async () => {
    const respuesta = await autorizado(api().post('/api/historias').send({ data: historiaValida() }));

    expect(respuesta.status).toBe(201);
    const documentId = respuesta.body.data.documentId;

    const publicada = await strapi.documents(HISTORIA_UID).findOne({ documentId, status: 'published' });
    expect(publicada).toBeNull();

    const borrador = await strapi.documents(HISTORIA_UID).findOne({ documentId, status: 'draft' });
    expect(borrador).not.toBeNull();
  });

  it('una historia recién enviada no aparece en el listado público', async () => {
    const creada = await autorizado(
      api()
        .post('/api/historias')
        .send({ data: historiaValida({ alias: 'Voz Firme #1111' }) })
    );

    const listado = await autorizado(api().get('/api/historias?pagination[pageSize]=100'));

    expect(listado.status).toBe(200);
    const ids = listado.body.data.map((h: { documentId: string }) => h.documentId);
    expect(ids).not.toContain(creada.body.data.documentId);
  });

  it('la historia aparece en el listado público una vez que un gestor la publica', async () => {
    const creada = await autorizado(
      api()
        .post('/api/historias')
        .send({ data: historiaValida({ alias: 'Aurora Serena #2222' }) })
    );
    const documentId = creada.body.data.documentId;

    // Publicar desde el document service es el camino del panel: sin contexto
    // de pedido HTTP, el middleware no interviene. Es exactamente lo que hace
    // una persona moderando.
    await strapi.documents(HISTORIA_UID).publish({ documentId });

    const listado = await autorizado(api().get('/api/historias?pagination[pageSize]=100'));
    const ids = listado.body.data.map((h: { documentId: string }) => h.documentId);
    expect(ids).toContain(documentId);
  });

  it('pedir status=published al crear no publica nada: se fuerza a borrador', async () => {
    const respuesta = await autorizado(
      api()
        .post('/api/historias?status=published')
        .send({ data: historiaValida({ alias: 'Semilla Libre #3333' }) })
    );

    expect(respuesta.status).toBe(201);

    const publicada = await strapi
      .documents(HISTORIA_UID)
      .findOne({ documentId: respuesta.body.data.documentId, status: 'published' });
    expect(publicada).toBeNull();
  });

  it('la Content API no puede publicar por update, ni con el permiso concedido', async () => {
    const creada = await autorizado(
      api()
        .post('/api/historias')
        .send({ data: historiaValida({ alias: 'Llama Templada #4444' }) })
    );
    const documentId = creada.body.data.documentId;

    const respuesta = await autorizado(
      api().put(`/api/historias/${documentId}?status=published`).send({ data: { alias: 'Llama Templada #4444' } })
    );

    expect(respuesta.status).toBeGreaterThanOrEqual(400);

    const publicada = await strapi.documents(HISTORIA_UID).findOne({ documentId, status: 'published' });
    expect(publicada).toBeNull();
  });

  it('la Content API no puede borrar, ni con el permiso concedido', async () => {
    const creada = await autorizado(
      api()
        .post('/api/historias')
        .send({ data: historiaValida({ alias: 'Estrella Valiente #5555' }) })
    );
    const documentId = creada.body.data.documentId;

    const respuesta = await autorizado(api().delete(`/api/historias/${documentId}`));

    expect(respuesta.status).toBeGreaterThanOrEqual(400);

    const borrador = await strapi.documents(HISTORIA_UID).findOne({ documentId, status: 'draft' });
    expect(borrador).not.toBeNull();
  });

  // Contrapartida de lo anterior: quien modera SÍ tiene que poder borrar un
  // testimonio abusivo. El middleware solo cierra la puerta de la API.
  it('el document service (panel) sí puede borrar una historia', async () => {
    const creada = await strapi.documents(HISTORIA_UID).create({ data: historiaValida() });

    await expect(strapi.documents(HISTORIA_UID).delete({ documentId: creada.documentId })).resolves.toBeDefined();
  });
});
