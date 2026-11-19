import { Router } from 'express';
import {
  listarPujas,
  obtenerPuja,
  crearPuja,
  actualizarPuja,
  eliminarPuja,
} from '../controladores/puja.controller.js';
import { verificarToken, exigirRol } from '../middlewares/autenticacion.middleware.js';
import { validarParametroId } from '../middlewares/validar.middleware.js';

const rutas = Router();
rutas.use(verificarToken);

rutas.get('/', listarPujas);
rutas.get('/:id', validarParametroId('id'), obtenerPuja);
rutas.post('/', crearPuja);
rutas.put('/:id', validarParametroId('id'), actualizarPuja);
rutas.patch('/:id', validarParametroId('id'), actualizarPuja);
rutas.delete('/:id', validarParametroId('id'), exigirRol('admin'), eliminarPuja);

export default rutas;
