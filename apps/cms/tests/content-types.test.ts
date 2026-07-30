import { setupStrapi, cleanupStrapi } from './helpers/strapi';

// Smoke test de arranque + contrato del modelo de datos. El brief es
// explícito: renombrar un campo existente, borrarlo, o cambiar los
// valores posibles de un enum rompe el build del sitio Astro. Este test
// no reemplaza la comunicación con el otro equipo, pero sí evita que un
// cambio accidental de nombre pase inadvertido en este repo.
describe('Modelo de datos', () => {
  beforeAll(async () => {
    await setupStrapi();
  }, 60000);

  afterAll(async () => {
    await cleanupStrapi();
  });

  it('arranca Strapi con los cuatro content-types y las tres páginas estáticas registrados', () => {
    expect(strapi.contentType('api::categoria-recurso.categoria-recurso')).toBeDefined();
    expect(strapi.contentType('api::pagina.pagina')).toBeDefined();
    expect(strapi.contentType('api::institucion.institucion')).toBeDefined();
    expect(strapi.contentType('api::sobre-el-proyecto.sobre-el-proyecto')).toBeDefined();
    expect(strapi.contentType('api::terminos.terminos')).toBeDefined();
    expect(strapi.contentType('api::privacidad.privacidad')).toBeDefined();
  });

  // Sección fue eliminada del modelo: los nuevos requerimientos descartan
  // agrupar páginas para la navegación. La reemplaza Categoría de recurso,
  // que solo agrupa tarjetas en /recursos y no participa de la URL.
  it('seccion ya no existe en el modelo', () => {
    expect(Object.keys(strapi.contentTypes)).not.toContain('api::seccion.seccion');
  });

  it('categoria-recurso no tiene draft & publish (siempre visible)', () => {
    const schema = strapi.contentType('api::categoria-recurso.categoria-recurso');
    expect(schema.options?.draftAndPublish).toBe(false);
  });

  it('pagina cuelga de una categoría de recurso, requerida y sin efecto en la URL', () => {
    const attrs = strapi.contentType('api::pagina.pagina').attributes;
    expect(Object.keys(attrs)).not.toContain('seccion');
    expect(attrs.categoria.type).toBe('relation');
    expect((attrs.categoria as { target: string }).target).toBe('api::categoria-recurso.categoria-recurso');
    expect(attrs.categoria.required).toBe(true);
    // El slug es lo único que define la ruta pública (/recursos/{slug}).
    expect(attrs.slug.type).toBe('uid');
    expect((attrs.slug as { targetField: string }).targetField).toBe('titulo');
  });

  it('pagina e institucion tienen draft & publish habilitado', () => {
    expect(strapi.contentType('api::pagina.pagina').options?.draftAndPublish).toBe(true);
    expect(strapi.contentType('api::institucion.institucion').options?.draftAndPublish).toBe(true);
  });

  it('pagina.contenido es de tipo blocks, nunca richtext ni un campo de HTML libre', () => {
    const attrs = strapi.contentType('api::pagina.pagina').attributes;
    expect(attrs.contenido.type).toBe('blocks');
  });

  it('institucion expone exactamente el contrato de campos del brief', () => {
    const attrs = strapi.contentType('api::institucion.institucion').attributes;

    expect(attrs.tipo.type).toBe('enumeration');
    expect((attrs.tipo as { enum: string[] }).enum.sort()).toEqual(
      [
        'defensoria',
        'felcv',
        'fiscalia',
        'policia',
        'slim',
        'linea_emergencia',
        'psicologico',
        'ong',
        'refugio',
        'otro',
      ].sort()
    );
    expect(attrs.telefonos.type).toBe('component');
    expect((attrs.telefonos as { component: string }).component).toBe('contacto.telefono');
    expect((attrs.telefonos as { repeatable: boolean }).repeatable).toBe(true);
    expect(attrs.verificadoEn.type).toBe('date');
    expect(attrs.verificadoEn.required).toBe(true);
    expect(attrs.activa.type).toBe('boolean');
    expect((attrs.activa as { default: boolean }).default).toBe(true);
  });

  // Subproducto /blog. Draft & Publish no es un detalle de comodidad editorial
  // acá: es LA cola de moderación. Sin login, un testimonio o un mensaje de
  // apoyo visible sin revisión previa es el fallo que este producto no puede
  // permitirse, así que el flag es parte del contrato del modelo.
  it('historia y comentario-historia tienen draft & publish habilitado (es la cola de moderación)', () => {
    expect(strapi.contentType('api::historia.historia').options?.draftAndPublish).toBe(true);
    expect(strapi.contentType('api::comentario-historia.comentario-historia').options?.draftAndPublish).toBe(true);
  });

  it('historia expone el contrato de campos que consume /blog', () => {
    const attrs = strapi.contentType('api::historia.historia').attributes;

    expect(attrs.contenido.type).toBe('text');
    expect(attrs.contenido.required).toBe(true);
    expect((attrs.contenido as { minLength: number }).minLength).toBe(20);
    expect((attrs.contenido as { maxLength: number }).maxLength).toBe(8000);

    expect(attrs.categoria.type).toBe('enumeration');
    expect((attrs.categoria as { enum: string[] }).enum.sort()).toEqual(
      [
        'general',
        'violencia_fisica',
        'violencia_psicologica',
        'violencia_economica',
        'violencia_digital',
        'proceso_de_salida',
        'recuperacion',
      ].sort()
    );

    // El alias es OPCIONAL a propósito: sin valor significa que se publicó de
    // forma anónima. Volverlo requerido obligaría a guardar un nombre de
    // relleno y a interpretarlo después en cada lectura.
    expect(attrs.alias.type).toBe('string');
    expect(attrs.alias.required).toBeFalsy();
    expect((attrs.alias as { maxLength: number }).maxLength).toBe(40);

    expect(attrs.comentarios.type).toBe('relation');
    expect((attrs.comentarios as { target: string }).target).toBe(
      'api::comentario-historia.comentario-historia'
    );
  });

  it('comentario-historia cuelga de una historia requerida', () => {
    const attrs = strapi.contentType('api::comentario-historia.comentario-historia').attributes;

    expect(attrs.contenido.type).toBe('text');
    expect((attrs.contenido as { maxLength: number }).maxLength).toBe(2000);
    expect(attrs.historia.type).toBe('relation');
    expect((attrs.historia as { target: string }).target).toBe('api::historia.historia');
    expect(attrs.historia.required).toBe(true);
  });

  // El ipHash existe solo para que quien modera note veinte historias
  // ofensivas del mismo origen. Si dejara de ser privado pasaría a ser un dato
  // personal servido en una respuesta pública, en un producto cuya promesa
  // central es el anonimato.
  it('ipHash es privado en historia y en comentario-historia: nunca sale por la API', () => {
    const historia = strapi.contentType('api::historia.historia').attributes;
    const comentario = strapi.contentType('api::comentario-historia.comentario-historia').attributes;

    expect((historia.ipHash as { private: boolean }).private).toBe(true);
    expect((comentario.ipHash as { private: boolean }).private).toBe(true);
  });

  it('el componente contacto.telefono expone numero, etiqueta y esGratuito', () => {
    const component = strapi.components['contacto.telefono'];
    expect(component).toBeDefined();
    expect(component.attributes.numero.type).toBe('string');
    expect(component.attributes.esGratuito.type).toBe('boolean');
  });
});
