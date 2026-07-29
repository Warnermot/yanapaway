import path from 'path';
import crypto from 'crypto';

// Config específica del entorno "test": sqlite aislado y descartable,
// sin importar qué DATABASE_CLIENT esté seteado en .env. Así la suite
// corre rápido y aislada, y nunca toca la base de Postgres real de
// desarrollo. El job de CI aparte corre la misma suite contra
// Postgres 16 real (ver README de tests).
//
// No se usa ":memory:": @strapi/database (5.51.0) le aplica
// `path.resolve()` sin distinguir el caso especial, así que termina
// abriendo un archivo llamado literalmente ":memory:" dentro del
// directorio del proyecto en vez de una base en memoria (bug de esa
// versión, reproducible incluso fuera de este repo). Un archivo sqlite
// real y único por proceso logra el mismo aislamiento sin depender de
// ese caso especial.
export default () => ({
  connection: {
    client: 'sqlite',
    connection: {
      filename: path.join(process.cwd(), '.tmp', `test-${process.pid}-${crypto.randomUUID()}.db`),
    },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
  },
});
