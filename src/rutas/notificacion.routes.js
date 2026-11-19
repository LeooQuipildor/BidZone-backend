/**
 * ============================================================================
 * ARCHIVO: src/rutas/notificacion.routes.js
 * PREFIJO: /api/notificaciones
 * ============================================================================
 * Bandeja de notificaciones personales del usuario (ofertas superadas, cierres, etc.).
 * Nota: '/leer-todas' va ANTES de '/:id' para que Express no confunda 'leer-todas' con un ID.
 */

import { Router } from 'express';
import {
  listarNotificaciones,
  crearNotificacion,
  marcarLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
} from '../controladores/notificacion.controller.js';
import { verificarToken, exigirRol } from '../middlewares/autenticacion.middleware.js';
import { validarParametroId } from '../middlewares/validar.middleware.js';

const rutas = Router();
rutas.use(verificarToken);

rutas.get('/', listarNotificaciones);
rutas.post('/', exigirRol('admin'), crearNotificacion);
rutas.patch('/leer-todas', marcarTodasLeidas);
rutas.patch('/:id/leida', validarParametroId('id'), marcarLeida);
rutas.put('/:id', validarParametroId('id'), marcarLeida);
rutas.delete('/:id', validarParametroId('id'), eliminarNotificacion);

export default rutas;
