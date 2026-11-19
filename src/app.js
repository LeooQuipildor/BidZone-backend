/**
 * ============================================================================
 * ARCHIVO: src/app.js
 * ROL: Configuración central de Express (puerta de entrada de todas las peticiones).
 * ============================================================================
 *
 * ¿CÓMO VIAJA UNA PETICIÓN AQUÍ?
 * Cada vez que React hace un fetch('http://localhost:3000/api/...'), Express pasa
 * la petición de arriba hacia abajo por cada "app.use(...)" en el orden exacto
 * en que están escritos:
 *   1. cors(...)          -> Permite que el navegador acepte respuestas desde otro puerto (5173 -> 3000).
 *   2. express.json(...)  -> Lee el JSON que viene en el cuerpo y lo guarda en "req.body".
 *   3. app.get('/')       -> Responde un mensaje de bienvenida si alguien entra a la raíz.
 *   4. app.use('/api',..) -> Envía cualquier ruta "/api/..." al enrutador principal (src/rutas/index.js).
 *   5. rutaNoEncontrada   -> Si ninguna ruta coincidió, devuelve 404.
 *   6. manejarErrores     -> Si algún paso lanzó un error, lo convierte en un JSON prolijo.
 */

import express from 'express';
import cors from 'cors';
import { entorno } from './config/entorno.js';
import rutasApi from './rutas/index.js';
import { rutaNoEncontrada, manejarErrores } from './middlewares/errores.middleware.js';

// Creamos la instancia principal de Express
const app = express();

// 1. CORS: divide la variable CORS_ORIGIN por comas (ej: "http://localhost:5173,http://localhost:5174")
const origenesPermitidos = entorno.origenCors.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origenesPermitidos.includes('*') ? true : origenesPermitidos, credentials: true }));

// 2. Parser JSON: transforma el texto JSON enviado por el frontend en un objeto JS en req.body (máximo 1 MB)
app.use(express.json({ limit: '1mb' }));

// 3. Ruta raíz (GET http://localhost:3000/): sirve para comprobar rápido que el servidor responde
app.get('/', (_req, res) => {
  res.status(200).json({ nombre: 'BidZone API REST', version: '1.0.0', salud: '/api/salud' });
});

// 4. Montamos todas las rutas de la API bajo el prefijo "/api"
app.use('/api', rutasApi);

// 5. Si ninguna ruta anterior atendió la URL, respondemos Error 404
app.use(rutaNoEncontrada);

// 6. Manejador global de errores: siempre debe ir al final de todos los app.use()
app.use(manejarErrores);

// Exportamos "app" para que servidor.js lo levante y api.test.js pueda probarlo
export default app;
