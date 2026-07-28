import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// El rol de Postgres que usa DATABASE_URL debe tener permisos limitados
// (lectura/escritura solo sobre las tablas de este módulo), no el
// superusuario. La creación de ese rol es una tarea de infraestructura,
// pendiente junto con el resto de la Fase 0.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
