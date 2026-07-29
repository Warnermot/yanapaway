type Entrada = { conteo: number; expiraEn: number };

// En memoria, por proceso: suficiente mientras el servidor corra en una
// sola instancia Node (adapter "standalone"). Si el proyecto escala a
// múltiples instancias, esto debe moverse a un store compartido (Redis).
const intentosPorClave = new Map<string, Entrada>();

export function excedeLimite(clave: string, maxIntentos: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const entrada = intentosPorClave.get(clave);

  if (!entrada || entrada.expiraEn < ahora) {
    intentosPorClave.set(clave, { conteo: 1, expiraEn: ahora + ventanaMs });
    return false;
  }

  entrada.conteo += 1;
  return entrada.conteo > maxIntentos;
}
