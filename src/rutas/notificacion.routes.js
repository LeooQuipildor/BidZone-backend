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
rutas.patch('/read-all', marcarTodasLeidas);
rutas.patch('/:id/read', validarParametroId('id'), marcarLeida);
rutas.put('/:id', validarParametroId('id'), marcarLeida);
rutas.delete('/:id', validarParametroId('id'), eliminarNotificacion);

export default rutas;
