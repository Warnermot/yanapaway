import { createHash } from 'node:crypto';

// Huella de origen para moderación: le permite a quien revisa /blog notar que
// veinte historias ofensivas salieron del mismo lugar, sin guardar nunca la IP.
//
// Sin `HASH_SALT` NO se hashea: se devuelve undefined. El espacio de IPv4 tiene
// 2^32 valores, así que un sha256 sin sal (o con una sal por defecto conocida,
// como hacía el prototipo con 'sal-local') se revierte por fuerza bruta en
// segundos. Un campo vacío es honesto; un hash reversible es un dato personal
// disfrazado de anónimo.
const SAL = process.env.HASH_SALT;

let yaAvisado = false;

export function hashearIp(ip: string | undefined): string | undefined {
  if (!SAL) {
    if (!yaAvisado) {
      yaAvisado = true;
      console.warn(
        '[blog] HASH_SALT no está definido: no se guarda huella de origen para moderación. ' +
          'Definir HASH_SALT en apps/web/.env (ver .env.example) para habilitarla.'
      );
    }
    return undefined;
  }

  if (!ip) {
    return undefined;
  }

  return createHash('sha256').update(`${SAL}:${ip}`).digest('hex');
}
