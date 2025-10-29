const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Define el puerto dinámico de Heroku o usa 3000
const PORT = process.env.PORT || 3000; 

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ... [Modelo de Lead y conexión a MongoDB sin cambios] ...
const LeadSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema, 'pruebas'); 

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.log('Error conectando a DB:', err));

// ... [Config Email y Ruta /submit sin cambios] ...
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.post('/submit', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    // Guardar en DB
    const newLead = new Lead({ name, email, message });
    await newLead.save();

    // Enviar email (opcional, si funciona)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'cliente@email.com', 
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
    res.status(500).json({ error: 'Error procesando' }); // Mejor código de estado para errores
  }
});

// ... [Rutas /admin y /admin/login sin cambios] ...

// Iniciar servidor usando el PORT dinámico
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
