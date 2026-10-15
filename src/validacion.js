// Validación de los datos del formulario de contacto.
const LIMITES = { name: 100, email: 254, message: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Devuelve { lead } con los datos limpios, o { error } con un mensaje para el usuario.
function validarLead(cuerpo) {
  const datos = {};
  for (const campo of Object.keys(LIMITES)) {
    const valor = cuerpo?.[campo];
    if (typeof valor !== 'string' || !valor.trim()) {
      return { error: 'Por favor, llena todos los campos.' };
    }
    datos[campo] = valor.trim();
    if (datos[campo].length > LIMITES[campo]) {
      return { error: `El campo ${campo} es demasiado largo.` };
    }
  }
  if (!EMAIL_RE.test(datos.email)) {
    return { error: 'El correo no es válido.' };
  }
  return { lead: datos };
}

module.exports = { validarLead, LIMITES };
