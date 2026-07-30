// Seudónimo anónimo para firmar una historia o un mensaje de apoyo.
//
// Se genera en el servidor, uno nuevo por publicación, y no se guarda ninguna
// relación alias <-> persona: sin login no hay identidad estable, y en este
// producto eso es una decisión, no una limitación. Dos historias de la misma
// persona no son vinculables ni por quien lee ni por quien modera.
//
// Los adjetivos están en femenino: el público de este espacio son mujeres
// sobrevivientes de violencia de pareja.

const ADJETIVOS = [
  'Valiente',
  'Fuerte',
  'Resiliente',
  'Serena',
  'Firme',
  'Luminosa',
  'Constante',
  'Libre',
  'Íntegra',
  'Templada',
] as const;

const SUSTANTIVOS = ['Voz', 'Estrella', 'Raíz', 'Llama', 'Marea', 'Semilla', 'Aurora', 'Brisa'] as const;

function alAzar<T>(opciones: readonly T[]): T {
  return opciones[Math.floor(Math.random() * opciones.length)];
}

export function generarAlias(): string {
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `${alAzar(SUSTANTIVOS)} ${alAzar(ADJETIVOS)} #${numero}`;
}
