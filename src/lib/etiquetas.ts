import type { TipoInstitucion } from '../db/queries/instituciones';

export const TIPO_INSTITUCION_LABELS: Record<TipoInstitucion, string> = {
  defensoria: 'Defensoría',
  felcv: 'FELCV',
  fiscalia: 'Fiscalía',
  policia: 'Policía',
  slim: 'SLIM',
  linea_emergencia: 'Línea de emergencia',
  otro: 'Otro',
};

const TIPO_CASO_LABELS: Record<string, string> = {
  violencia_noviazgo: 'Violencia en el noviazgo',
  grooming: 'Grooming',
  sextorsion: 'Sextorsión',
  control_digital: 'Control digital',
  consentimiento: 'Consentimiento',
};

export function etiquetaTipoCaso(nombre: string): string {
  return TIPO_CASO_LABELS[nombre] ?? nombre.replaceAll('_', ' ');
}
