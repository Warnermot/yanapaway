import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export async function iniciarBaseDePrueba() {
  const contenedor = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = contenedor.getConnectionUri();

  const { db } = await import('../client');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');

  await migrate(db, { migrationsFolder: 'src/db/migrations' });

  return { contenedor, db };
}

export async function detenerBaseDePrueba(contenedor: StartedPostgreSqlContainer) {
  const { pool } = await import('../client');
  await pool.end();
  await contenedor.stop();
}
