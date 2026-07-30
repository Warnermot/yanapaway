// Strapi devuelve fechas en ISO 8601 con zona ('2026-07-30T14:12:00.000Z').
// El prototipo del blog venía con fechas de sqlite en formato '2026-07-30
// 14:12:00' — sin la T ni la Z —, que V8 interpreta como hora local y Safari
// directamente como Invalid Date. Todo lo que se muestre debe pasar por acá.

export function formatearFecha(iso: string, lang = 'es-BO'): string {
  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  return fecha.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
}
