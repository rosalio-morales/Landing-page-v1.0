// Aplicación Express: formulario de contacto (/submit) y panel de admin (/admin).
// Se construye con sus dependencias inyectadas para poder probarla sin MongoDB.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validarLead, LIMITES } = require('./validacion');
const {
  escapeHtml,
  verificarPassword,
  igualSeguro,
  crearSesion,
  leerSesion,
} = require('./seguridad');

const COOKIE = 'admin_sesion';
const DURACION_SESION = 2 * 60 * 60 * 1000; // 2 horas

function leerCookie(req, nombre) {
  const cookies = req.headers.cookie || '';
  for (const parte of cookies.split(';')) {
    const [clave, ...valor] = parte.trim().split('=');
    if (clave === nombre) return decodeURIComponent(valor.join('='));
  }
  return null;
}

function pagina(titulo, contenido) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${escapeHtml(titulo)}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 960px; margin: 40px auto; padding: 0 16px; color: #1f2937; }
      h1 { color: #1d4ed8; }
      form.login { display: grid; gap: 12px; max-width: 320px; }
      input, button { font: inherit; padding: 8px 10px; }
      button { cursor: pointer; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; }
      td.mensaje { white-space: pre-wrap; word-break: break-word; }
      .error { color: #b91c1c; }
      .barra { display: flex; justify-content: space-between; align-items: center; }
    </style>
  </head>
  <body>${contenido}</body>
</html>`;
}

function formularioLogin(error) {
  return pagina(
    'Panel de admin',
    `<h1>Panel de registros</h1>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
    <form class="login" method="post" action="/admin/login">
      <label>Usuario <input name="user" autocomplete="username" required></label>
      <label>Contraseña <input name="pass" type="password" autocomplete="current-password" required></label>
      <button type="submit">Entrar</button>
    </form>`
  );
}

function tablaLeads(leads) {
  const filas = leads
    .map(
      (lead) => `<tr>
        <td>${escapeHtml(lead.name)}</td>
        <td>${escapeHtml(lead.email)}</td>
        <td class="mensaje">${escapeHtml(lead.message)}</td>
        <td>${escapeHtml(new Date(lead.date).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }))}</td>
      </tr>`
    )
    .join('');
  return pagina(
    'Leads',
    `<div class="barra">
      <h1>Leads guardados (${leads.length})</h1>
      <form method="post" action="/admin/logout"><button type="submit">Cerrar sesión</button></form>
    </div>
    <table>
      <tr><th>Nombre</th><th>Correo</th><th>Mensaje</th><th>Fecha</th></tr>
      ${filas || '<tr><td colspan="4">Todavía no hay registros.</td></tr>'}
    </table>`
  );
}

/**
 * @param {object} deps
 * @param {object} deps.Lead            Modelo con create() y find()
 * @param {object} deps.config          Variables de entorno ya leídas
 * @param {function} [deps.notificar]   Envía el aviso de un lead nuevo (opcional)
 */
function crearApp({ Lead, config, notificar = async () => {} }) {
  const app = express();
  const produccion = config.NODE_ENV === 'production';
  const adminActivo = Boolean(
    config.ADMIN_USER && config.ADMIN_PASSWORD_HASH && config.SESSION_SECRET
  );

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());

  const origenes = String(config.ALLOWED_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // ── Formulario público ──────────────────────────────────────────────
  app.options('/submit', cors({ origin: origenes, methods: ['POST'] }));
  app.post(
    '/submit',
    cors({ origin: origenes, methods: ['POST'] }),
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }),
    express.json({ limit: '10kb' }),
    async (req, res) => {
      // Campo trampa: los bots lo llenan, las personas no lo ven.
      if (req.body?.website) {
        return res.json({ success: '¡Mensaje enviado! Te contactaremos pronto.' });
      }
      const { lead, error } = validarLead(req.body);
      if (error) return res.status(400).json({ error });

      try {
        await Lead.create(lead);
      } catch (err) {
        console.error('Error guardando lead:', err.message);
        return res.status(500).json({ error: 'No pudimos guardar tu mensaje. Intenta de nuevo.' });
      }

      notificar(lead).catch((err) => console.error('Error enviando aviso:', err.message));
      res.status(201).json({ success: '¡Mensaje enviado! Te contactaremos pronto.' });
    }
  );

  // ── Panel de admin ──────────────────────────────────────────────────
  const soloAdmin = (req, res, next) => {
    if (!adminActivo) return res.status(503).send('Panel de admin no configurado.');
    next();
  };
  const usuarioActual = (req) => leerSesion(leerCookie(req, COOKIE), config.SESSION_SECRET);

  app.get('/admin', soloAdmin, async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!usuarioActual(req)) return res.send(formularioLogin());
    try {
      const leads = await Lead.find().sort({ date: -1 }).limit(500).lean();
      res.send(tablaLeads(leads));
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/admin/login',
    soloAdmin,
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, skipSuccessfulRequests: true }),
    express.urlencoded({ extended: false, limit: '2kb' }),
    (req, res) => {
      const { user = '', pass = '' } = req.body || {};
      // Se verifican ambos siempre para no revelar cuál de los dos falló.
      const usuarioOk = igualSeguro(user, config.ADMIN_USER);
      const passOk = verificarPassword(String(pass), config.ADMIN_PASSWORD_HASH);
      if (!usuarioOk || !passOk) {
        return res.status(401).send(formularioLogin('Usuario o contraseña incorrectos.'));
      }
      res.cookie(COOKIE, crearSesion(config.ADMIN_USER, config.SESSION_SECRET, DURACION_SESION), {
        httpOnly: true,
        secure: produccion,
        sameSite: 'strict',
        maxAge: DURACION_SESION,
        path: '/admin',
      });
      res.redirect(303, '/admin');
    }
  );

  app.post('/admin/logout', (req, res) => {
    res.clearCookie(COOKIE, { path: '/admin' });
    res.redirect(303, '/admin');
  });

  app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Error interno');
  });

  return app;
}

module.exports = { crearApp, LIMITES };
