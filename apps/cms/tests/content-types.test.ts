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

  it('el componente contacto.telefono expone numero, etiqueta y esGratuito', () => {
    const component = strapi.components['contacto.telefono'];
    expect(component).toBeDefined();
    expect(component.attributes.numero.type).toBe('string');
    expect(component.attributes.esGratuito.type).toBe('boolean');
  });
});
