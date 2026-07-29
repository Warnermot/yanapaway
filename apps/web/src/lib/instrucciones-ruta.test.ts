import { describe, expect, it } from 'vitest';
import { describirManiobra, formatearMetros, formatearSegundos } from './instrucciones-ruta';

function paso(type: string, modifier?: string, name?: string, exit?: number) {
  return { maneuver: { type, modifier, exit }, name, distance: 100 };
}

describe('describirManiobra', () => {
  // Tipos observados en respuestas reales de OSRM para Sucre.
  it('describe la salida', () => {
    expect(describirManiobra(paso('depart', 'straight', 'Calle Churuquella'))).toBe(
      'Empieza el recorrido por Calle Churuquella',
    );
  });

  it('describe la llegada', () => {
    expect(describirManiobra(paso('arrive', undefined, 'Calle Eduardo Berdecio'))).toBe(
      'Llegaste a destino, en Calle Eduardo Berdecio',
    );
  });

  it('describe giros con su dirección', () => {
    expect(describirManiobra(paso('turn', 'right', 'Calle Topater'))).toBe(
      'Gira a la derecha en Calle Topater',
    );
    expect(describirManiobra(paso('turn', 'slight left', 'Calle Junín'))).toBe(
      'Gira levemente a la izquierda en Calle Junín',
    );
  });

  it('trata el giro recto como continuar, no como giro', () => {
    expect(describirManiobra(paso('turn', 'straight', 'Av. Venezuela'))).toBe(
      'Continúa derecho por Av. Venezuela',
    );
  });

  it('describe el giro en U', () => {
    expect(describirManiobra(paso('turn', 'uturn', 'Calle Grau'))).toBe(
      'Haz un giro en U en Calle Grau',
    );
  });

  it('describe el cambio de nombre de calle como continuar', () => {
    expect(describirManiobra(paso('new name', 'straight', 'Calle Tiorinaceo'))).toBe(
      'Continúa por Calle Tiorinaceo',
    );
  });

  it('describe el fin de calle', () => {
    expect(describirManiobra(paso('end of road', 'left', 'Calle Torrelio'))).toBe(
      'Al final de la calle, gira a la izquierda en Calle Torrelio',
    );
  });

  it('incluye el número de salida en las rotondas', () => {
    expect(describirManiobra(paso('roundabout', 'right', 'Av. del Maestro', 2))).toBe(
      'En la rotonda, toma la salida 2 por Av. del Maestro',
    );
  });

  it('omite la calle cuando OSRM la devuelve vacía', () => {
    expect(describirManiobra(paso('turn', 'right', ''))).toBe('Gira a la derecha');
    expect(describirManiobra(paso('depart', 'straight', '   '))).toBe('Empieza el recorrido');
  });

  it('no falla con un tipo de maniobra desconocido', () => {
    expect(describirManiobra(paso('maniobra inventada', 'right', 'Calle X'))).toBe(
      'Continúa por Calle X',
    );
    expect(describirManiobra(paso('maniobra inventada'))).toBe('Continúa');
  });
});

describe('formatearMetros', () => {
  it('usa metros por debajo de un kilómetro', () => {
    expect(formatearMetros(54)).toBe('54 m');
    expect(formatearMetros(999)).toBe('999 m');
  });

  it('usa kilómetros con coma decimal', () => {
    expect(formatearMetros(1000)).toBe('1,0 km');
    expect(formatearMetros(4600)).toBe('4,6 km');
  });
});

describe('formatearSegundos', () => {
  it('redondea a un minuto como mínimo', () => {
    expect(formatearSegundos(5)).toBe('1 min');
  });

  it('muestra minutos', () => {
    expect(formatearSegundos(660)).toBe('11 min');
  });

  it('muestra horas y minutos', () => {
    expect(formatearSegundos(3600)).toBe('1 h');
    expect(formatearSegundos(5400)).toBe('1 h 30 min');
  });
});
