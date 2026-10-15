// Utilidades de seguridad sin dependencias externas: escape de HTML,
// hash de contraseñas con scrypt y sesiones firmadas con HMAC.
const crypto = require('node:crypto');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Formato: scrypt$<sal en base64>$<hash en base64>
function hashPassword(password) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, sal, 64);
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

function verificarPassword(password, almacenado) {
  const [algoritmo, sal, hash] = String(almacenado || '').split('$');
  if (algoritmo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = crypto.scryptSync(password, Buffer.from(sal, 'base64'), esperado.length);
  return crypto.timingSafeEqual(calculado, esperado);
}

// Compara dos cadenas en tiempo constante (evita filtrar el usuario por tiempos).
function igualSeguro(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function firmar(datos, secreto) {
  return crypto.createHmac('sha256', secreto).update(datos).digest('base64url');
}

function crearSesion(usuario, secreto, duracionMs) {
  const datos = Buffer.from(JSON.stringify({ u: usuario, exp: Date.now() + duracionMs })).toString(
    'base64url'
  );
  return `${datos}.${firmar(datos, secreto)}`;
}

// Devuelve el usuario si el token es auténtico y no ha expirado; si no, null.
function leerSesion(token, secreto) {
  const [datos, firma] = String(token || '').split('.');
  if (!datos || !firma) return null;
  const esperada = Buffer.from(firmar(datos, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) {
    return null;
  }
  try {
    const { u, exp } = JSON.parse(Buffer.from(datos, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now() ? u : null;
  } catch {
    return null;
  }
}

module.exports = { escapeHtml, hashPassword, verificarPassword, igualSeguro, crearSesion, leerSesion };
