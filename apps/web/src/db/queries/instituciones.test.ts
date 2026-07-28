import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { detenerBaseDePrueba, iniciarBaseDePrueba } from '../test-utils/base-datos-prueba';

let contenedor: StartedPostgreSqlContainer;

describe('consultas de instituciones', () => {
  beforeAll(async () => {
    ({ contenedor } = await iniciarBaseDePrueba());
  }, 60_000);

  afterAll(async () => {
    await detenerBaseDePrueba(contenedor);
  });

  beforeEach(async () => {
    const { db } = await import('../client');
    const {
      instituciones,
      tiposCaso,
      institucionesTiposCaso,
      solicitudesOrientacion,
      sedesInstitucion,
    } = await import('../schema');
    await db.delete(solicitudesOrientacion);
    await db.delete(institucionesTiposCaso);
    await db.delete(sedesInstitucion);
    await db.delete(instituciones);
    await db.delete(tiposCaso);
  });

  it('listarInstituciones excluye las inactivas', async () => {
    const { db } = await import('../client');
    const { instituciones } = await import('../schema');
    const { listarInstituciones } = await import('./instituciones');

    await db.insert(instituciones).values([
      { nombre: 'FELCV Sucre', tipo: 'felcv', estaActivo: true },
      { nombre: 'Institucion inactiva', tipo: 'otro', estaActivo: false },
    ]);

    const resultado = await listarInstituciones();

    expect(resultado.map((i) => i.nombre)).toEqual(['FELCV Sucre']);
  });

  it('listarInstituciones filtra por tipo', async () => {
    const { db } = await import('../client');
    const { instituciones } = await import('../schema');
    const { listarInstituciones } = await import('./instituciones');

    await db.insert(instituciones).values([
      { nombre: 'FELCV Sucre', tipo: 'felcv' },
      { nombre: 'Defensoria Sucre', tipo: 'defensoria' },
    ]);

    const resultado = await listarInstituciones({ tipo: 'felcv' });

    expect(resultado.map((i) => i.nombre)).toEqual(['FELCV Sucre']);
  });

  it('listarInstituciones filtra por tipo de caso', async () => {
    const { db } = await import('../client');
    const { instituciones, tiposCaso, institucionesTiposCaso } = await import('../schema');
    const { listarInstituciones } = await import('./instituciones');

    const [felcv] = await db
      .insert(instituciones)
      .values({ nombre: 'FELCV Sucre', tipo: 'felcv' })
      .returning();
    const [defensoria] = await db
      .insert(instituciones)
      .values({ nombre: 'Defensoria Sucre', tipo: 'defensoria' })
      .returning();
    const [grooming] = await db.insert(tiposCaso).values({ nombre: 'grooming' }).returning();

    await db.insert(institucionesTiposCaso).values({
      institucionId: felcv.id,
      tipoCasoId: grooming.id,
    });

    const resultado = await listarInstituciones({ tipoCasoId: grooming.id });

    expect(resultado.map((i) => i.nombre)).toEqual(['FELCV Sucre']);
    expect(defensoria).toBeDefined();
  });

  it('listarInstitucionesCercanas ordena por distancia real', async () => {
    const { db } = await import('../client');
    const { instituciones } = await import('../schema');
    const { listarInstitucionesCercanas } = await import('./instituciones');

    await db.insert(instituciones).values([
      { nombre: 'Cercana', tipo: 'felcv', latitud: -19.041, longitud: -65.251 },
      { nombre: 'Lejana', tipo: 'defensoria', latitud: -16.5, longitud: -68.15 },
      { nombre: 'Sin coordenadas', tipo: 'otro' },
    ]);

    const resultado = await listarInstitucionesCercanas(-19.04, -65.25);

    expect(resultado.map((i) => i.nombre)).toEqual(['Cercana', 'Lejana']);
    expect(resultado[0].distanciaKm).toBeLessThan(resultado[1].distanciaKm);
  });

  it('listarInstitucionesCercanas con soloEmergencia filtra correctamente', async () => {
    const { db } = await import('../client');
    const { instituciones } = await import('../schema');
    const { listarInstitucionesCercanas } = await import('./instituciones');

    await db.insert(instituciones).values([
      { nombre: 'Linea 156', tipo: 'linea_emergencia', latitud: -19.04, longitud: -65.25, esEmergencia: true },
      { nombre: 'FELCV Sucre', tipo: 'felcv', latitud: -19.041, longitud: -65.251, esEmergencia: false },
    ]);

    const resultado = await listarInstitucionesCercanas(-19.04, -65.25, true);

    expect(resultado.map((i) => i.nombre)).toEqual(['Linea 156']);
  });

  it('obtenerInstitucionPorId devuelve la institucion con sus tipos de caso', async () => {
    const { db } = await import('../client');
    const { instituciones, tiposCaso, institucionesTiposCaso } = await import('../schema');
    const { obtenerInstitucionPorId } = await import('./instituciones');

    const [felcv] = await db
      .insert(instituciones)
      .values({ nombre: 'FELCV Sucre', tipo: 'felcv' })
      .returning();
    const [grooming] = await db.insert(tiposCaso).values({ nombre: 'grooming' }).returning();
    await db
      .insert(institucionesTiposCaso)
      .values({ institucionId: felcv.id, tipoCasoId: grooming.id });

    const resultado = await obtenerInstitucionPorId(felcv.id);

    expect(resultado?.nombre).toBe('FELCV Sucre');
    expect(resultado?.tiposCaso.map((t) => t.nombre)).toEqual(['grooming']);
  });

  it('obtenerInstitucionPorId devuelve null si no existe', async () => {
    const { obtenerInstitucionPorId } = await import('./instituciones');

    const resultado = await obtenerInstitucionPorId('00000000-0000-0000-0000-000000000000');

    expect(resultado).toBeNull();
  });

  it('obtenerInstitucionPorId incluye las sedes de la institucion', async () => {
    const { db } = await import('../client');
    const { instituciones, sedesInstitucion } = await import('../schema');
    const { obtenerInstitucionPorId } = await import('./instituciones');

    const [felcv] = await db
      .insert(instituciones)
      .values({ nombre: 'FELCV Sucre', tipo: 'felcv' })
      .returning();
    await db.insert(sedesInstitucion).values([
      { institucionId: felcv.id, nombre: 'EPI Patacón', latitud: -19.0283, longitud: -65.266 },
      { institucionId: felcv.id, nombre: 'EPI Villa Armonía', latitud: -19.0179, longitud: -65.266 },
    ]);

    const resultado = await obtenerInstitucionPorId(felcv.id);

    expect(resultado?.sedes.map((s) => s.nombre).sort()).toEqual([
      'EPI Patacón',
      'EPI Villa Armonía',
    ]);
  });

  it('listarPuntosMapa combina coordenadas directas y de sedes', async () => {
    const { db } = await import('../client');
    const { instituciones, sedesInstitucion } = await import('../schema');
    const { listarPuntosMapa } = await import('./instituciones');

    const [conCoordenadaDirecta] = await db
      .insert(instituciones)
      .values({ nombre: 'Linea 156', tipo: 'linea_emergencia', latitud: -19.04, longitud: -65.25 })
      .returning();

    const [conSedes] = await db
      .insert(instituciones)
      .values({ nombre: 'FELCV Sucre', tipo: 'felcv' })
      .returning();
    await db.insert(sedesInstitucion).values([
      { institucionId: conSedes.id, nombre: 'EPI Patacón', latitud: -19.0283, longitud: -65.266 },
      { institucionId: conSedes.id, nombre: 'EPI Villa Armonía', latitud: -19.0179, longitud: -65.266 },
    ]);

    await db.insert(instituciones).values({ nombre: 'Sin ubicacion', tipo: 'otro' });

    const puntos = await listarPuntosMapa();

    expect(puntos).toHaveLength(3);
    expect(puntos.find((p) => p.institucionId === conCoordenadaDirecta.id)?.nombre).toBe(
      'Linea 156',
    );
    expect(puntos.filter((p) => p.institucionId === conSedes.id).map((p) => p.nombre).sort()).toEqual([
      'FELCV Sucre · EPI Patacón',
      'FELCV Sucre · EPI Villa Armonía',
    ]);
  });
});
