const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('../src/app');
const { hashPassword, crearSesion, leerSesion, escapeHtml } = require('../src/seguridad');
const { validarLead } = require('../src/validacion');

// Modelo en memoria con la misma forma que usa la app (create y find().sort().limit().lean()).
function modeloFalso() {
  const datos = [];
  return {
    datos,
    async create(doc) {
      datos.push({ ...doc, date: new Date() });
    },
    find() {
      const cadena = { sort: () => cadena, limit: () => cadena, lean: async () => [...datos] };
      return cadena;
    },
  };
}

const config = {
  ALLOWED_ORIGIN: 'https://landing.example',
  ADMIN_USER: 'admin',
  ADMIN_PASSWORD_HASH: hashPassword('una-contraseña-larga'),
  SESSION_SECRET: 'secreto-de-pruebas',
};

describe('API de la landing', () => {
  let servidor, base, Lead;

  before(async () => {
    Lead = modeloFalso();
    servidor = crearApp({ Lead, config }).listen(0);
    await new Promise((r) => servidor.once('listening', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
  });
  after(() => servidor.close());

  const enviar = (cuerpo) =>
    fetch(`${base}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://landing.example' },
      body: JSON.stringify(cuerpo),
    });

  const login = (user, pass) =>
    fetch(`${base}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ user, pass }),
      redirect: 'manual',
    });

  test('guarda un lead válido', async () => {
    const res = await enviar({ name: 'Ana', email: 'ana@correo.com', message: 'Hola' });
    assert.equal(res.status, 201);
    assert.equal(Lead.datos.at(-1).email, 'ana@correo.com');
  });

  test('rechaza datos incompletos o inválidos', async () => {
    assert.equal((await enviar({ name: 'Ana', email: 'no-es-correo', message: 'x' })).status, 400);
    assert.equal((await enviar({ name: 'Ana' })).status, 400);
  });

  test('ignora a los bots que llenan el campo trampa', async () => {
    const antes = Lead.datos.length;
    const res = await enviar({ name: 'Bot', email: 'b@b.com', message: 'spam', website: 'x' });
    assert.equal(res.status, 200);
    assert.equal(Lead.datos.length, antes);
  });

  test('solo permite CORS al dominio configurado', async () => {
    const ok = await enviar({ name: 'Ana', email: 'ana@correo.com', message: 'Hola' });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://landing.example');
    const ajeno = await fetch(`${base}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://malicioso.example' },
      body: JSON.stringify({ name: 'X', email: 'x@x.com', message: 'x' }),
    });
    assert.equal(ajeno.headers.get('access-control-allow-origin'), null);
  });

  test('no sirve el código del servidor', async () => {
    for (const ruta of ['/server.js', '/.env', '/package.json']) {
      assert.equal((await fetch(base + ruta)).status, 404, ruta);
    }
  });

  test('el panel pide login y rechaza credenciales incorrectas', async () => {
    const panel = await (await fetch(`${base}/admin`)).text();
    assert.match(panel, /<form class="login"/);
    assert.equal((await login('admin', 'incorrecta')).status, 401);
  });

  test('con sesión válida muestra los leads escapados (sin XSS)', async () => {
    await enviar({ name: '<script>alert(1)</script>', email: 'x@x.com', message: '<img src=x onerror=alert(1)>' });
    const res = await login('admin', 'una-contraseña-larga');
    assert.equal(res.status, 303);
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);

    const html = await (await fetch(`${base}/admin`, { headers: { Cookie: cookie.split(';')[0] } })).text();
    assert.match(html, /Leads guardados/);
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(!html.includes('<img src=x'));
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  });

  test('una cookie alterada no da acceso', async () => {
    const falsa = crearSesion('admin', 'otro-secreto', 60_000);
    const html = await (await fetch(`${base}/admin`, { headers: { Cookie: `admin_sesion=${falsa}` } })).text();
    assert.match(html, /<form class="login"/);
  });
});

describe('utilidades', () => {
  test('escapeHtml neutraliza los caracteres especiales', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  test('las sesiones expiran', () => {
    assert.equal(leerSesion(crearSesion('admin', 's', 60_000), 's'), 'admin');
    assert.equal(leerSesion(crearSesion('admin', 's', -1), 's'), null);
  });

  test('validarLead recorta espacios y limita longitudes', () => {
    assert.deepEqual(validarLead({ name: ' Ana ', email: 'a@b.co', message: ' hola ' }).lead, {
      name: 'Ana',
      email: 'a@b.co',
      message: 'hola',
    });
    assert.ok(validarLead({ name: 'x'.repeat(101), email: 'a@b.co', message: 'hola' }).error);
  });
});
