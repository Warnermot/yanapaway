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
    expect(strapi.contentType('api::seccion.seccion')).toBeDefined();
    expect(strapi.contentType('api::pagina.pagina')).toBeDefined();
    expect(strapi.contentType('api::institucion.institucion')).toBeDefined();
    expect(strapi.contentType('api::sobre-el-proyecto.sobre-el-proyecto')).toBeDefined();
    expect(strapi.contentType('api::terminos.terminos')).toBeDefined();
    expect(strapi.contentType('api::privacidad.privacidad')).toBeDefined();
  });

  it('seccion no tiene draft & publish (alimenta la navegación)', () => {
    const schema = strapi.contentType('api::seccion.seccion');
    expect(schema.options?.draftAndPublish).toBe(false);
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
      ['policial', 'judicial', 'salud', 'psicologico', 'ong', 'refugio'].sort()
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
