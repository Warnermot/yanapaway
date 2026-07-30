import { describe, expect, it } from 'vitest';
import { ANONIMA, nombreParaMostrar, normalizarNombre, resolverNombrePublico } from './nombre-publico';

describe('nombreParaMostrar', () => {
  it('muestra el nombre elegido cuando hay uno', () => {
    expect(nombreParaMostrar('Rosa')).toBe('Rosa');
  });

  // Sin alias no hay "sin firma": hay una firma explícita que dice Anónima.
  it('muestra Anónima cuando no hay alias', () => {
    expect(nombreParaMostrar(undefined)).toBe(ANONIMA);
    expect(nombreParaMostrar(null)).toBe(ANONIMA);
    expect(nombreParaMostrar('')).toBe(ANONIMA);
    expect(nombreParaMostrar('   ')).toBe(ANONIMA);
  });
});

describe('normalizarNombre', () => {
  it('deja el nombre en una sola línea', () => {
    expect(normalizarNombre('Rosa\nMaría')).toBe('Rosa María');
  });

  it('colapsa espacios y recorta los extremos', () => {
    expect(normalizarNombre('  Rosa    María  ')).toBe('Rosa María');
  });

  it('descarta caracteres invisibles', () => {
    expect(normalizarNombre(`Ro${String.fromCharCode(0x200b)}sa`)).toBe('Rosa');
  });
});

describe('resolverNombrePublico', () => {
  it('con la casilla marcada publica como anónima e ignora lo que haya en el campo', () => {
    expect(resolverNombrePublico('Rosa', true)).toEqual({ valido: true, alias: undefined });
    expect(resolverNombrePublico('', true)).toEqual({ valido: true, alias: undefined });
  });

  it('acepta un nombre elegido cuando la casilla no está marcada', () => {
    expect(resolverNombrePublico('  Rosa  ', false)).toEqual({ valido: true, alias: 'Rosa' });
  });

  // Sin esto, quien no marca la casilla y deja el campo vacío se publicaría
  // como anónima sin haberlo pedido. La decisión tiene que ser explícita.
  it('exige una decisión: ni casilla marcada ni nombre escrito es un error', () => {
    const resultado = resolverNombrePublico('', false);
    expect(resultado.valido).toBe(false);
    expect(resultado).toMatchObject({ error: expect.stringContaining('anónima') });
  });

  it('rechaza un nombre que es solo espacios', () => {
    expect(resolverNombrePublico('   ', false).valido).toBe(false);
  });

  it('rechaza un nombre demasiado corto o demasiado largo', () => {
    expect(resolverNombrePublico('R', false).valido).toBe(false);
    expect(resolverNombrePublico('a'.repeat(41), false).valido).toBe(false);
    expect(resolverNombrePublico('a'.repeat(40), false).valido).toBe(true);
  });

  // El nombre se muestra en grande arriba de cada historia: es justo donde
  // alguien pone su teléfono o su correo sin medir la consecuencia.
  it('rechaza datos de contacto en el nombre', () => {
    expect(resolverNombrePublico('rosa@correo.com', false).valido).toBe(false);
    expect(resolverNombrePublico('escribeme a www.miweb.com', false).valido).toBe(false);
    expect(resolverNombrePublico('Rosa 70012345', false).valido).toBe(false);
    expect(resolverNombrePublico('Rosa 700 123 45', false).valido).toBe(false);
  });

  it('no confunde un año o un número corto con un dato de contacto', () => {
    expect(resolverNombrePublico('Rosa 1990', false)).toEqual({ valido: true, alias: 'Rosa 1990' });
  });

  it('rechaza un nombre que no es texto cuando no se pidió anonimato', () => {
    expect(resolverNombrePublico(undefined, false).valido).toBe(false);
    expect(resolverNombrePublico(42, false).valido).toBe(false);
  });

  // `anonima` llega del JSON del formulario: solo el booleano true cuenta.
  it('solo el booleano true activa el anonimato', () => {
    expect(resolverNombrePublico('', 'true').valido).toBe(false);
    expect(resolverNombrePublico('', 1).valido).toBe(false);
  });
});
