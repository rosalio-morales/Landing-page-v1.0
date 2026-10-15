// Genera el valor de ADMIN_PASSWORD_HASH. La contraseña se pide por la
// terminal (sin eco) para que no quede en el historial del shell.
const readline = require('node:readline');
const { hashPassword } = require('../src/seguridad');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (texto) => {
  if (texto.includes('Contraseña')) process.stdout.write(texto);
};
rl.question('Contraseña del admin: ', (password) => {
  rl.close();
  process.stdout.write('\n');
  if (password.length < 12) {
    console.error('Usa al menos 12 caracteres.');
    process.exit(1);
  }
  console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
});
