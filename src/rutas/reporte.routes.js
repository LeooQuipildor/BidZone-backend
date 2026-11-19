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
