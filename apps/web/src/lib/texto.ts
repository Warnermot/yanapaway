// Normalización del texto que envía el público en /blog.
//
// No se sanitiza HTML porque no se guarda HTML: el contenido viaja y se
// almacena como texto plano, y las páginas lo interpolan sin `set:html`, así
// que Astro lo escapa. Meter una librería de sanitización acá daría una falsa
// sensación de que en algún punto se confía en markup.
//
// El orden importa: normalizar PRIMERO y validar el largo DESPUÉS. Al revés,
// una entrada de 25 caracteres hecha de espacios y saltos pasa un mínimo de 20
// y se guarda prácticamente vacía.
//
// Las clases se escriben con propiedades Unicode (\p{...}) en lugar de rangos
// literales para que este archivo sea ASCII puro: un NBSP o un zero-width
// pegado dentro de un corchete es invisible en la revisión de código.

export function normalizarTextoPlano(valor: string): string {
  return (
    valor
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ')
      // Zs: NBSP y espacios tipográficos. Parecen un espacio pero no colapsan
      // como tal, así que se los pasa a espacio normal antes de colapsar.
      .replace(/\p{Zs}/gu, ' ')
      // Zl/Zp: separadores de línea y de párrafo Unicode.
      .replace(/[\p{Zl}\p{Zp}]/gu, '\n')
      // Cc: controles C0/C1. Cf: caracteres de formato (zero-width, BOM,
      // marcas de dirección), que sirven para esconder texto de quien modera.
      // El \n ya normalizado es el único control que se conserva.
      .replace(/[\p{Cc}\p{Cf}]/gu, (caracter) => (caracter === '\n' ? caracter : ''))
      // Un párrafo en blanco separa ideas; cinco son un intento de empujar el
      // resto de la página fuera de la vista.
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      // Espacios sobrantes al final de cada línea, que quedan tras lo anterior.
      .replace(/ +\n/g, '\n')
      .trim()
  );
}

/** Recorta para un listado sin cortar una palabra al medio. */
export function extracto(texto: string, maximo = 220): string {
  if (texto.length <= maximo) {
    return texto;
  }

  const cortado = texto.slice(0, maximo);
  const ultimoEspacio = cortado.lastIndexOf(' ');

  return `${(ultimoEspacio > maximo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd()}…`;
}
