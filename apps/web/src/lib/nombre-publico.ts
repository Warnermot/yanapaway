import { normalizarTextoPlano } from './texto';

// Con qué nombre se firma una historia o un mensaje de apoyo en /blog.
//
// Antes el sitio generaba un seudónimo ("Marea Resiliente #4821"). Se descartó
// por devolución de las usuarias: nadie se sentía representada por un nombre
// que no eligió. Ahora hay dos opciones y ninguna intermedia: escribir un
// nombre propio, o publicar como anónima.
//
// En el CMS eso se guarda en `alias`, que pasó a ser opcional: SIN valor
// significa anónima. La ausencia del dato es la anonimidad — no se guarda un
// nombre de relleno que después haya que interpretar.

export const ANONIMA = 'Anónima';

export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 40;

/** Único lugar donde se decide qué se muestra cuando no hay nombre. */
export function nombreParaMostrar(alias?: string | null): string {
  return alias?.trim() || ANONIMA;
}

/** El nombre es de una sola línea: los saltos se vuelven espacios. */
export function normalizarNombre(valor: string): string {
  return normalizarTextoPlano(valor)
    .replace(/\n+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

// Un campo de nombre que se muestra en grande arriba de cada historia es
// justo donde alguien escribe "escríbeme a ..." o su teléfono. La moderación
// lo atajaría igual, pero acá el aviso le llega a la persona en el momento, y
// no después de esperar una revisión para que le rechacen el envío.
function pareceDatoDeContacto(nombre: string): boolean {
  const digitos = (nombre.match(/\d/g) ?? []).length;
  return nombre.includes('@') || /https?:\/\/|www\./i.test(nombre) || digitos >= 6;
}

export type ResultadoNombre =
  | { valido: true; alias: string | undefined }
  | { valido: false; error: string };

/**
 * Resuelve con qué firma se publica, a partir de lo que manda el formulario.
 * `alias: undefined` significa anónima.
 */
export function resolverNombrePublico(nombre: unknown, anonima: unknown): ResultadoNombre {
  if (anonima === true) {
    return { valido: true, alias: undefined };
  }

  if (typeof nombre !== 'string') {
    return { valido: false, error: 'Elige un nombre para firmar o marca la casilla de publicar como anónima.' };
  }

  const normalizado = normalizarNombre(nombre);

  if (normalizado.length === 0) {
    return { valido: false, error: 'Elige un nombre para firmar o marca la casilla de publicar como anónima.' };
  }

  if (normalizado.length < NOMBRE_MIN || normalizado.length > NOMBRE_MAX) {
    return {
      valido: false,
      error: `El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`,
    };
  }

  if (pareceDatoDeContacto(normalizado)) {
    return {
      valido: false,
      error: 'El nombre no puede incluir correos, enlaces ni números de teléfono.',
    };
  }

  return { valido: true, alias: normalizado };
}
