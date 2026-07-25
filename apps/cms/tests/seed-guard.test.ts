import { spawnSync } from 'child_process';
import path from 'path';

// El brief es explícito: un dato de prueba llegando a producción no debe
// poder poner a nadie a marcar un número inexistente en una emergencia. La
// primera línea de defensa es que el propio seed se niegue a correr con
// NODE_ENV=production. Este test lo verifica ejecutando el script real como
// subproceso (así se prueba la guarda de verdad, no una versión mockeada).
describe('Guarda de producción del seed', () => {
  it('aborta con código de salida distinto de cero cuando NODE_ENV=production', () => {
    const seedPath = path.join(__dirname, '..', 'scripts', 'seed.ts');
    const resultado = spawnSync('pnpm', ['exec', 'tsx', seedPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production' },
      encoding: 'utf8',
      timeout: 60_000,
    });

    expect(resultado.status).not.toBe(0);
    expect(`${resultado.stderr}${resultado.stdout}`).toContain('producción');
  }, 70_000);
});
