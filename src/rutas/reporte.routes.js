/**
 * ============================================================================
 * ARCHIVO: src/rutas/reporte.routes.js
 * PREFIJO: /api/reportes
 * ============================================================================
 * Rutas de tickets de mediación por incumplimiento (RN06).
 * Cualquier usuario logueado puede abrir un ticket; solo el admin puede borrarlos.
 */

import { Router } from 'express';
import {
  listarReportes,
  obtenerReporte,
  crearReporte,
  actualizarReporte,
  eliminarReporte,
} from '../controladores/reporte.controller.js';
import { verificarToken, exigirRol } from '../middlewares/autenticacion.middleware.js';
import { validarParametroId } from '../middlewares/validar.middleware.js';

const rutas = Router();
rutas.use(verificarToken);

rutas.get('/', listarReportes);
rutas.get('/:id', validarParametroId('id'), obtenerReporte);
rutas.post('/', crearReporte);
rutas.put('/:id', validarParametroId('id'), actualizarReporte);
rutas.patch('/:id', validarParametroId('id'), actualizarReporte);
rutas.delete('/:id', validarParametroId('id'), exigirRol('admin'), eliminarReporte);

export default rutas;
