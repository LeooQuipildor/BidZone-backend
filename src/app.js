import express from 'express';
import cors from 'cors';
import { entorno } from './config/entorno.js';
import rutasApi from './rutas/index.js';
import { rutaNoEncontrada, manejarErrores } from './middlewares/errores.middleware.js';

const app = express();

// Permite peticiones desde el frontend (React en localhost:5173)
const origenesPermitidos = entorno.origenCors.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origenesPermitidos.includes('*') ? true : origenesPermitidos, credentials: true }));

// Permite leer JSON en req.body
app.use(express.json({ limit: '1mb' }));

// Ruta raíz de bienvenida
app.get('/', (_req, res) => {
  res.status(200).json({ name: 'BidZone REST API', version: '1.0.0', docs: '/api/health' });
});

// Todas las rutas de la API viven bajo /api
app.use('/api', rutasApi);

// Manejo de rutas inexistentes (404) y errores generales
app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
