import { describe, expect, it } from 'vitest';
import { extracto, normalizarTextoPlano } from './texto';

// Los caracteres problemáticos se construyen por code point a propósito: un
// NBSP o un zero-width pegado literalmente en el fuente es invisible en la
// revisión de código y no se distingue de un espacio normal.
const car = (codigo: number) => String.fromCharCode(codigo);

const NBSP = car(0x00a0);
const ZERO_WIDTH = car(0x200b);
const BOM = car(0xfeff);
const NUL = car(0x0000);
const SEPARADOR_LINEA = car(0x2028);

describe('normalizarTextoPlano', () => {
  it('recorta los extremos y unifica los saltos de Windows', () => {
    expect(normalizarTextoPlano('  hola\r\nmundo  ')).toBe('hola\nmundo');
  });

  it('conserva un párrafo en blanco pero colapsa los excesos', () => {
    expect(normalizarTextoPlano('uno\n\ndos')).toBe('uno\n\ndos');
    expect(normalizarTextoPlano('uno\n\n\n\n\n\ndos')).toBe('uno\n\ndos');
  });

  it('colapsa espacios repetidos y los que quedan al final de una línea', () => {
    expect(normalizarTextoPlano('hola     mundo')).toBe('hola mundo');
    expect(normalizarTextoPlano('hola   \nmundo')).toBe('hola\nmundo');
  });

  // Un NBSP no se distingue de un espacio en el panel de moderación, pero no
  // colapsa como espacio: sirve para inflar el largo sin que se note.
  it('normaliza espacios invisibles y descarta caracteres de formato', () => {
    expect(normalizarTextoPlano(`hola${NBSP}${NBSP}mundo`)).toBe('hola mundo');
    expect(normalizarTextoPlano(`ho${ZERO_WIDTH}la`)).toBe('hola');
    expect(normalizarTextoPlano(`${BOM}hola`)).toBe('hola');
  });

  it('descarta caracteres de control pero conserva los saltos de línea', () => {
    expect(normalizarTextoPlano(`ho${NUL}la`)).toBe('hola');
    expect(normalizarTextoPlano('uno\ndos')).toBe('uno\ndos');
  });

  it('convierte los separadores de línea Unicode en saltos reales', () => {
    expect(normalizarTextoPlano(`uno${SEPARADOR_LINEA}dos`)).toBe('uno\ndos');
  });

  it('convierte tabulaciones en espacios', () => {
    expect(normalizarTextoPlano('uno\tdos')).toBe('uno dos');
  });

  // El prototipo validaba el largo ANTES de limpiar, así que 25 caracteres de
  // espacios y saltos pasaban el mínimo de 20 y se guardaba una historia vacía.
  // Normalizar primero es lo que cierra ese hueco.
  it('deja en cadena vacía una entrada que solo tiene espacios y saltos', () => {
    expect(normalizarTextoPlano('   \n\n\t   \r\n      ')).toBe('');
    expect(normalizarTextoPlano(NBSP.repeat(30))).toBe('');
  });

  it('no toca el contenido legítimo de un testimonio', () => {
    const testimonio = 'Salí de esa relación en marzo.\n\nHoy estoy mejor: tengo trabajo y una red.';
    expect(normalizarTextoPlano(testimonio)).toBe(testimonio);
  });
});

describe('extracto', () => {
  it('devuelve el texto tal cual si no excede el máximo', () => {
    expect(extracto('corto', 220)).toBe('corto');
  });

  it('corta en el último espacio para no partir una palabra', () => {
    expect(extracto('uno dos tres cuatro cinco', 12)).toBe('uno dos tres…');
  });

  it('corta duro cuando no hay un espacio razonable donde cortar', () => {
    expect(extracto('a'.repeat(50), 10)).toBe(`${'a'.repeat(10)}…`);
  });
});
