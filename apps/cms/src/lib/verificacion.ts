// Umbral de vigencia de `verificadoEn` para instituciones, compartido entre
// el middleware que bloquea publicar (src/middlewares/institucion-reglas.ts)
// y el cron que despublica lo vencido (src/cron/despublicar-vencidas.ts).
export const VERIFICACION_AVISO_DIAS = 15;

export function verificacionMaxDias(): number {
  return Number.parseInt(process.env.VERIFICACION_MAX_DIAS ?? '180', 10);
}

export function diasDesde(fecha: unknown): number | null {
  if (!fecha || typeof fecha !== 'string') return null;

  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return null;

  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
}

export function estaVencida(fecha: unknown): boolean {
  const dias = diasDesde(fecha);
  return dias === null || dias > verificacionMaxDias();
}
