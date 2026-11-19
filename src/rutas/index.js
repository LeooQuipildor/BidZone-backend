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

// Endpoint de salud para comprobar que el servidor y MySQL están vivos
rutasApi.get(
  '/health',
  atraparErrores(async (_req, res) => {
    const bdConectada = await probarConexionBd();
    res.status(200).json({
      status: 'ok',
      service: 'bidzone-api',
      database: bdConectada ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  })
);

// Rutas en español
rutasApi.use('/autenticacion', rutasAutenticacion);
rutasApi.use('/usuarios', rutasUsuario);
rutasApi.use('/subastas', rutasSubasta);
rutasApi.use('/pujas', rutasPuja);
rutasApi.use('/reportes', rutasReporte);
rutasApi.use('/resenas', rutasResena);
rutasApi.use('/notificaciones', rutasNotificacion);

// Alias en inglés para mantener 100% compatibilidad con el frontend React
rutasApi.use('/auth', rutasAutenticacion);
rutasApi.use('/users', rutasUsuario);
rutasApi.use('/auctions', rutasSubasta);
rutasApi.use('/bids', rutasPuja);
rutasApi.use('/reports', rutasReporte);
rutasApi.use('/reviews', rutasResena);
rutasApi.use('/notifications', rutasNotificacion);

export default rutasApi;
