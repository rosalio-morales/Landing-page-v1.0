# Landing Page Profesional con Formulario y DB

Una landing page moderna y responsiva con formulario de contacto, almacenamiento en MongoDB y panel de admin. Ideal para freelancers y negocios pequeños. Construida con Node.js, Express, MongoDB y Tailwind CSS.

## Características
- **Diseño Responsivo**: Funciona en PC, tablet y móvil con animaciones suaves (AOS).
- **Formulario Interactivo**: Validación en tiempo real, mensajes de éxito/error que desaparecen automáticamente.
- **Almacenamiento en DB**: Leads guardados en MongoDB Atlas (gratuito).
- **Envío de Emails**: Opcional con Gmail o SendGrid (configura en .env).
- **Panel de Admin**: Página segura para ver registros de leads (login requerido).
- **Fácil Personalización**: Cambia colores, textos e iconos según el cliente.

## Instalación y Configuración
1. **Descarga/Instala**:
   - Clona este repo o descarga los archivos.
   - Instala Node.js (nodejs.org) y MongoDB Compass (opcional para ver DB local).

2. **Dependencias**:
   - Corre `npm install` en la carpeta del proyecto (instala express, mongoose, nodemailer, etc.).

3. **Archivo .env**:
   - Crea un archivo `.env` en la raíz con:
     ```
     EMAIL_USER=tuemail@gmail.com
     EMAIL_PASS=tupassword
     MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/dbname
     ```
   - **MongoDB**: Crea cuenta gratuita en mongodb.com/atlas, cluster gratis, copia la URI.
   - **Email**: Usa Gmail (activa "acceso de apps menos seguras") o SendGrid para mejor entrega.

4. **Ejecutar**:
   - Corre `node server.js`.
   - Abre http://localhost:3000 en navegador.

## Uso
- **Página Principal**: Landing page con hero, servicios, testimonios y formulario.
- **Enviar Formulario**: Datos se validan, guardan en DB y envían email (si ha sido configurado).
- **Panel de Admin**: Ve a http://localhost:3000/admin, login con usuario "admin2023" y password "secure123" (cambia para seguridad). Verás tabla con leads.

## Personalización
- **Colores/Texto**: Edita `index.html` y `styles.css`.
- **Animaciones**: Ajusta en `script.js` (usa AOS library).
- **DB/Email**: Cambia en `server.js` y `.env`.

## Despliegue
- **Frontend (Netlify)**: Sube `index.html`, `styles.css`, `script.js` a netlify.com (gratis).
- **Backend (Heroku)**: Sube todo a heroku.com, configura vars de entorno (EMAIL_USER, etc.).
- **Demo Vivo**: Necesario para vender – incluye URL en anuncio.

## Precios de Venta (Código Fuente en Gumroad)
- **Básico ($20)**: Código fuente completo (landing page responsiva, formulario con validación, almacenamiento en MongoDB, envío de emails y panel de admin).
- **Premium ($30)**: Código fuente completo + 1 mes de soporte por email (ayuda con instalación, personalización o errores).
Compra aquí: https://chaliomorales.gumroad.com/l/ifxwz


## Screenshots

### Página Principal
![Vista de la página principal](images/screenshot1.png)

### Formulario Enviado
![Mensaje de éxito al enviar formulario](images/screenshot2.png)

### Panel de Admin
![Tabla de leads en el panel](images/screenshot3.png)

## Soporte
Si hay errores, revisa logs en terminal. Para personalización, contacta al desarrollador.
Rosalio Morales: <chaliomorales46@gmail.com>

## Licencia
Uso libre para proyectos personales/comerciales. No incluye garantía.

