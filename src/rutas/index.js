/**
 * ============================================================================
 * ARCHIVO: src/rutas/index.js
 * ROL: Enrutador maestro que conecta los 7 módulos de la API bajo el prefijo "/api".
 * ============================================================================
 *
 * Ejemplo de cómo arma Express las URLs finales:
 *   app.js monta este archivo en "/api"
 *   + este archivo monta rutasSubasta en "/subastas"
 *   + subasta.routes.js define "/:id"
 *   = URL final: GET http://localhost:3000/api/subastas/:id
 */

import { Router } from 'express';
import { probarConexionBd } from '../config/baseDatos.js';
import { atraparErrores } from '../middlewares/errores.middleware.js';
import rutasAutenticacion from './autenticacion.routes.js';
import rutasUsuario from './usuario.routes.js';
import rutasSubasta from './subasta.routes.js';
import rutasPuja from './puja.routes.js';
import rutasReporte from './reporte.routes.js';
import rutasResena from './resena.routes.js';
import rutasNotificacion from './notificacion.routes.js';

const rutasApi = Router();

// GET /api/salud -> Permite verificar rápidamente si el servidor y MySQL responden
rutasApi.get(
  '/salud',
  atraparErrores(async (_req, res) => {
    const bdConectada = await probarConexionBd();
    res.status(200).json({
      estado: 'ok',
      servicio: 'bidzone-api',
      baseDatos: bdConectada ? 'conectada' : 'desconectada',
      fecha: new Date().toISOString(),
    });
  })
);

// Conectamos cada módulo de rutas en su prefijo correspondiente
rutasApi.use('/autenticacion', rutasAutenticacion);
rutasApi.use('/usuarios', rutasUsuario);
rutasApi.use('/subastas', rutasSubasta);
rutasApi.use('/pujas', rutasPuja);
rutasApi.use('/reportes', rutasReporte);
rutasApi.use('/resenas', rutasResena);
rutasApi.use('/notificaciones', rutasNotificacion);

export default rutasApi;
