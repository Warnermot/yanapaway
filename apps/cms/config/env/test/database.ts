// Config específica del entorno "test": siempre sqlite en memoria,
// sin importar qué DATABASE_CLIENT esté seteado en .env. Así la suite
// corre rápido y aislada, y nunca toca la base de Postgres real de
// desarrollo. El job de CI aparte corre la misma suite contra
// Postgres 16 real (ver README de tests).
export default () => ({
  connection: {
    client: 'sqlite',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    // Cada conexión a ":memory:" es una base separada y vacía. Sin fijar
    // el pool a una sola conexión, el pool por defecto de knex (min 2) puede
    // repartir lecturas y escrituras entre bases distintas: un delete en una
    // conexión queda invisible para una lectura que cae en otra.
    pool: { min: 1, max: 1 },
  },
});
