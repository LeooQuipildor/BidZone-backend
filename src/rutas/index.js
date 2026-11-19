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

// Endpoint de salud para comprobar que el servidor y MySQL están activos
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

// Rutas principales en español
rutasApi.use('/autenticacion', rutasAutenticacion);
rutasApi.use('/usuarios', rutasUsuario);
rutasApi.use('/subastas', rutasSubasta);
rutasApi.use('/pujas', rutasPuja);
rutasApi.use('/reportes', rutasReporte);
rutasApi.use('/resenas', rutasResena);
rutasApi.use('/notificaciones', rutasNotificacion);

export default rutasApi;
