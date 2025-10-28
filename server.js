const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));  // AÑADE ESTA LÍNEA PARA FORMULARIOS HTML
app.use(express.static('.')); // Sirve archivos estáticos
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Modelo de Lead (define la estructura de datos)
const LeadSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema, 'pruebas'); // Guarda en colección 'pruebas'

// Conectar a DB (obligatoria ahora)
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.log('Error conectando a DB:', err));

// Config Email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Ruta para envío
app.post('/submit', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    // Guardar en DB
    const newLead = new Lead({ name, email, message });
    await newLead.save();

    // Enviar email (opcional, si funciona)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'cliente@email.com', // Tu email
      subject: 'Nuevo Lead de Landing Page',
      text: `Nombre: ${name}\nEmail: ${email}\nMensaje: ${message}`
    };
    transporter.sendMail(mailOptions, (error) => {
      if (error) console.log('Error email:', error);
      else console.log('Email enviado');
    });

    res.json({ success: '¡Mensaje enviado! Te contactaremos pronto.' });
  } catch (error) {
    console.log('Error guardando:', error);
    res.json({ error: 'Error procesando' });
  }
});

// Panel de admin con login simple
app.get('/admin', (req, res) => {
  res.send(`
    <html>
      <head><title>Panel de Admin - Landing Page</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;text-align: center">
        <h1>Login al Panel de Registros</h1>
        <form action="/admin/login" method="post">
          Usuario: <input name="user" required><br><br>
          Password: <input name="pass" type="password" required><br><br>
          <button type="submit">Entrar</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/admin/login', async (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin2023' && pass === 'secure123') { // Cambia para producción (ej. 'tuusuario' / 'tupasssegura')
    try {
      const leads = await Lead.find();
      res.send(`
        <html>
          <head><title>Registros de Leads</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: blue;text-align: center">Leads Guardados</h1>
            <table border="1" style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f2f2f2;">
                <th>Nombre</th><th>Email</th><th>Mensaje</th><th>Fecha</th>
              </tr>
              ${leads.map(lead => `<tr><td>${lead.name}</td><td>${lead.email}</td><td>${lead.message}</td><td>${lead.date}</td></tr>`).join('')}
            </table>
            <br><a href="/admin">Volver al Login</a>
          </body>
        </html>
      `);
    } catch (error) {
      res.send('Error cargando leads');
    }
  } else {
    res.send('Usuario o password incorrecto. <a href="/admin">Intentar de nuevo</a>');
  }
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
