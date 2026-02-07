const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();
const app = express();


// ===========================
// ===== CONFIGURACIONES =====
// ===========================


// Configurar el transportador de nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Configuración personalizada de CORS
const whitelist = process.env.CORS_ORIGIN.split(',');

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar rate limiter general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 requests por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiter a todas las rutas
app.use(limiter);

// Rate limiter específico para formularios (más restrictivo)
const formularioLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Límite de 10 envíos por hora
  message: 'Has enviado demasiados formularios. Por favor intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ===========================
// ====== EDNPOINTS =========
// ===========================


// Endpoint 1: Recibir datos del formulario de contacto
app.post('/api/formulario-contacto', formularioLimiter, async (req, res) => {
  const { nombreCliente, nombreEmpresa, email, descripcion } = req.body;
  
  // Aquí puedes procesar los datos
  console.log('Datos recibidos:', {
    nombreCliente,
    nombreEmpresa,
    email,
    descripcion
  });

  // Configurar el contenido del correo
  const mailOptions = {
    from: '"Formulario de Contacto" <TU_CORREO@gmail.com>',
    to: process.env.EMAIL_TO,
    subject: `Nuevo contacto de ${nombreCliente} - ${nombreEmpresa}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h2 {
              color: #2c3e50;
              border-bottom: 3px solid #3498db;
              padding-bottom: 10px;
            }
            .field {
              margin-bottom: 20px;
              background-color: white;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #3498db;
            }
            .label {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 5px;
              display: block;
            }
            .value {
              color: #555;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #888;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>📋 Nuevo Formulario de Contacto</h2>
            
            <div class="field">
              <span class="label">👤 Nombre del Cliente:</span>
              <span class="value">${nombreCliente}</span>
            </div>
            
            <div class="field">
              <span class="label">🏢 Nombre de la Empresa:</span>
              <span class="value">${nombreEmpresa}</span>
            </div>
            
            <div class="field">
              <span class="label">📧 Email:</span>
              <span class="value">${email}</span>
            </div>
            
            <div class="field">
              <span class="label">📝 Descripción:</span>
              <div class="value">${descripcion}</div>
            </div>
            
            <div class="footer">
              <p>Este correo fue enviado automáticamente desde el formulario de contacto</p>
              <p>Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  try {
    // Enviar el correo
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({
      mensaje: 'Formulario recibido y correo enviado correctamente',
      datos: { nombreCliente, nombreEmpresa, email, descripcion }
    });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({
      mensaje: 'Formulario recibido pero hubo un error al enviar el correo',
      error: error.message
    });
  }
});

// Endpoint 2: Recibir configuración de agente
app.post('/api/configuracion-agente', formularioLimiter, (req, res) => {
  const { tipoAgente, tipoEscenario, canalContacto, numeroTelefono } = req.body;
  
  // Aquí puedes procesar los datos
  console.log('Configuración recibida:', {
    tipoAgente,
    tipoEscenario,
    canalContacto,
    numeroTelefono
  });
  
  res.status(200).json({
    mensaje: 'Configuración de agente recibida correctamente',
    datos: { tipoAgente, tipoEscenario, canalContacto, numeroTelefono }
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
