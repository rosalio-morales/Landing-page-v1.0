// URL del backend (Render). Cambia este valor si despliegas tu propia copia.
const API_URL = 'https://landing-page-leads.onrender.com';

// Inicializar animaciones
AOS.init();

const form = document.getElementById('contactForm');
const boton = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    message: document.getElementById('message').value.trim(),
    website: document.getElementById('website').value,
  };

  if (!datos.name || !datos.email || !datos.message) {
    showResponse('Por favor, llena todos los campos.', 'error');
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Enviando…';
  try {
    const response = await fetch(`${API_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.success) {
      form.reset();
      showResponse(result.success, 'success');
    } else if (response.status === 429) {
      showResponse('Demasiados intentos. Espera unos minutos.', 'error');
    } else {
      showResponse(result.error || 'Error enviando. Intenta de nuevo.', 'error');
    }
  } catch {
    showResponse('No pudimos conectar con el servidor. Intenta de nuevo.', 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Enviar Mensaje';
  }
});

// Muestra el resultado con un fade-in y lo oculta a los 15 segundos
function showResponse(message, type) {
  const responseDiv = document.getElementById('response');
  responseDiv.textContent = message;
  responseDiv.className = 'mt-4 text-center font-semibold transition-opacity duration-500 opacity-0 p-2';
  responseDiv.classList.add(type === 'success' ? 'text-green-600' : 'text-red-600');
  setTimeout(() => responseDiv.classList.add('opacity-100'), 100);
  setTimeout(() => responseDiv.classList.remove('opacity-100'), 15000);
}
