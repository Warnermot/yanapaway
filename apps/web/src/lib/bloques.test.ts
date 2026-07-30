import { describe, expect, it } from 'vitest';
import { etiquetaTitulo, inlineDe, listasAnidadasDe, normalizarBloques, textoDe } from './bloques';

describe('normalizarBloques', () => {
  it('conserva los tipos de bloque que el sitio sabe renderizar', () => {
    const bloques = normalizarBloques([
      { type: 'paragraph', children: [{ type: 'text', text: 'Hola' }] },
      { type: 'heading', level: 2, children: [{ type: 'text', text: 'Título' }] },
      { type: 'list', format: 'unordered', children: [] },
      { type: 'quote', children: [{ type: 'text', text: 'Cita' }] },
      { type: 'code', children: [{ type: 'text', text: 'const a = 1;' }] },
      { type: 'image', image: { url: '/uploads/foto.png' } },
    ]);

    expect(bloques.map((bloque) => bloque.type)).toEqual([
      'paragraph',
      'heading',
      'list',
      'quote',
      'code',
      'image',
    ]);
  });

  it('descarta nodos desconocidos en vez de romper la página', () => {
    const bloques = normalizarBloques([
      { type: 'paragraph', children: [{ type: 'text', text: 'Sí' }] },
      { type: 'tabla-futura', children: [] },
      { sinType: true },
      null,
      'texto suelto',
    ]);

    expect(bloques).toHaveLength(1);
    expect(bloques[0].type).toBe('paragraph');
  });

  it('descarta una imagen sin url utilizable', () => {
    expect(normalizarBloques([{ type: 'image', image: {} }])).toEqual([]);
    expect(normalizarBloques([{ type: 'image' }])).toEqual([]);
  });

  it('devuelve vacío si el contenido no es un arreglo', () => {
    expect(normalizarBloques(undefined)).toEqual([]);
    expect(normalizarBloques(null)).toEqual([]);
    expect(normalizarBloques('<p>html</p>')).toEqual([]);
  });
});

describe('inlineDe', () => {
  it('conserva textos con sus marcas y enlaces', () => {
    const nodos = inlineDe({
      children: [
        { type: 'text', text: 'normal' },
        { type: 'text', text: 'fuerte', bold: true },
        { type: 'link', url: 'https://example.test', children: [{ type: 'text', text: 'link' }] },
      ],
    });

    expect(nodos).toHaveLength(3);
    expect(nodos[1]).toMatchObject({ text: 'fuerte', bold: true });
    expect(nodos[2]).toMatchObject({ type: 'link', url: 'https://example.test' });
  });

  it('descarta nodos inline inválidos y contenedores sin hijos', () => {
    expect(inlineDe({ children: [{ type: 'text' }, { type: 'link' }, { type: 'otro' }] })).toEqual([]);
    expect(inlineDe({})).toEqual([]);
  });
});

describe('listasAnidadasDe', () => {
  it('encuentra las sublistas dentro de un ítem', () => {
    const item = {
      type: 'list-item' as const,
      children: [
        { type: 'text' as const, text: 'padre' },
        { type: 'list' as const, format: 'ordered' as const, children: [] },
      ],
    };

    expect(listasAnidadasDe(item)).toHaveLength(1);
    expect(listasAnidadasDe({ type: 'list-item', children: [] })).toEqual([]);
  });
});

describe('textoDe', () => {
  it('junta el texto de un bloque de código, incluyendo enlaces', () => {
    const texto = textoDe({
      children: [
        { type: 'text', text: 'ver ' },
        { type: 'link', url: '#', children: [{ type: 'text', text: 'acá' }] },
      ],
    });

    expect(texto).toBe('ver acá');
  });
});

describe('etiquetaTitulo', () => {
  it('nunca devuelve h1: ese lugar es del título de la página', () => {
    expect(etiquetaTitulo(1)).toBe('h2');
    expect(etiquetaTitulo(2)).toBe('h2');
    expect(etiquetaTitulo(3)).toBe('h3');
    expect(etiquetaTitulo(6)).toBe('h6');
  });

  it('acota niveles fuera de rango', () => {
    expect(etiquetaTitulo(0)).toBe('h2');
    expect(etiquetaTitulo(99)).toBe('h6');
    expect(etiquetaTitulo(Number.NaN)).toBe('h2');
  });
});
