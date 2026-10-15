// Punto de entrada: conecta a MongoDB, configura el correo y levanta el servidor.
require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { crearApp, LIMITES } = require('./src/app');

const config = process.env;
const PORT = config.PORT || 3000;

if (!config.MONGO_URI) {
  console.error('Falta MONGO_URI en las variables de entorno.');
  process.exit(1);
}

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: LIMITES.name },
  email: { type: String, required: true, trim: true, maxlength: LIMITES.email },
  message: { type: String, required: true, trim: true, maxlength: LIMITES.message },
  date: { type: Date, default: Date.now },
});
const Lead = mongoose.model('Lead', LeadSchema, 'leads');

// El aviso por correo es opcional: solo se activa si están las tres variables.
let notificar;
if (config.EMAIL_USER && config.EMAIL_PASS && config.NOTIFY_EMAIL) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS },
  });
  notificar = (lead) =>
    transporter.sendMail({
      from: config.EMAIL_USER,
      to: config.NOTIFY_EMAIL,
      replyTo: lead.email,
      subject: `Nuevo contacto de ${lead.name}`,
      text: `Nombre: ${lead.name}\nCorreo: ${lead.email}\n\n${lead.message}`,
    });
}

mongoose
  .connect(config.MONGO_URI)
  .then(() => {
    console.log('Conectado a MongoDB');
    crearApp({ Lead, config, notificar }).listen(PORT, () =>
      console.log(`Servidor escuchando en el puerto ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message);
    process.exit(1);
  });
