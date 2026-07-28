import { db, pool } from './client';
import { tiposCaso } from './schema';

const NOMBRES_TIPOS_CASO = [
  'violencia_noviazgo',
  'grooming',
  'sextorsion',
  'control_digital',
  'consentimiento',
];

async function seed() {
  await db
    .insert(tiposCaso)
    .values(NOMBRES_TIPOS_CASO.map((nombre) => ({ nombre })))
    .onConflictDoNothing();

  console.log(`Seed completo: ${NOMBRES_TIPOS_CASO.length} tipos de caso.`);
  await pool.end();
}

seed();
