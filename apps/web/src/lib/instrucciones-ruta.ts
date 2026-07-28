/**
 * Traduce las maniobras que devuelve OSRM a instrucciones en español.
 *
 * OSRM entrega la maniobra en datos estructurados (tipo, modificador, calle),
 * pero no el texto de la indicación, así que se redacta acá.
 * Referencia: https://project-osrm.org/docs/v5.24.0/api/#stepmaneuver-object
 */

export type ManiobraOsrm = {
  type: string;
  modifier?: string;
  exit?: number;
};

export type PasoOsrm = {
  maneuver: ManiobraOsrm;
  name?: string;
  distance: number;
};

const DIRECCIONES: Record<string, string> = {
  uturn: 'en U',
  'sharp right': 'cerrada a la derecha',
  right: 'a la derecha',
  'slight right': 'levemente a la derecha',
  straight: 'recto',
  'slight left': 'levemente a la izquierda',
  left: 'a la izquierda',
  'sharp left': 'cerrada a la izquierda',
};

function direccion(modificador?: string): string {
  return DIRECCIONES[modificador ?? ''] ?? '';
}

export function formatearMetros(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

export function formatearSegundos(segundos: number): string {
  const minutos = Math.max(1, Math.round(segundos / 60));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Frase corta y legible para una maniobra del recorrido. */
export function describirManiobra(paso: PasoOsrm): string {
  const { type, modifier, exit } = paso.maneuver;
  const calle = paso.name?.trim() ? paso.name.trim() : '';
  const hacia = calle ? ` por ${calle}` : '';
  const en = calle ? ` en ${calle}` : '';
  const dir = direccion(modifier);

  switch (type) {
    case 'depart':
      return calle ? `Empieza el recorrido${hacia}` : 'Empieza el recorrido';

    case 'arrive':
      return calle ? `Llegaste a destino, en ${calle}` : 'Llegaste a destino';

    case 'turn':
      if (modifier === 'straight') return `Continúa derecho${hacia}`;
      if (modifier === 'uturn') return `Haz un giro en U${en}`;
      return dir ? `Gira ${dir}${en}` : `Gira${en}`;

    case 'new name':
    case 'continue':
    case 'notification':
      return `Continúa${hacia}`;

    case 'end of road':
      return dir ? `Al final de la calle, gira ${dir}${en}` : `Al final de la calle, continúa${en}`;

    case 'merge':
      return `Incorpórate${hacia}`;

    case 'on ramp':
      return `Toma el acceso${hacia}`;

    case 'off ramp':
      return `Toma la salida${hacia}`;

    case 'fork':
      return dir ? `En la bifurcación, mantente ${dir}${hacia}` : `Sigue en la bifurcación${hacia}`;

    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      if (exit) return `En la rotonda, toma la salida ${exit}${hacia}`;
      return `Entra en la rotonda${hacia}`;

    case 'exit roundabout':
    case 'exit rotary':
      return `Sal de la rotonda${hacia}`;

    default:
      return calle ? `Continúa${hacia}` : 'Continúa';
  }
}
