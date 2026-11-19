import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from '../controladores/usuario.controller.js';
import { verificarToken, exigirRol } from '../middlewares/autenticacion.middleware.js';
import { validarParametroId } from '../middlewares/validar.middleware.js';

const rutas = Router();
rutas.use(verificarToken);

rutas.get('/', listarUsuarios);
rutas.get('/:id', validarParametroId('id'), obtenerUsuario);
rutas.post('/', exigirRol('admin'), crearUsuario);
rutas.put('/:id', validarParametroId('id'), actualizarUsuario);
rutas.patch('/:id', validarParametroId('id'), actualizarUsuario);
rutas.delete('/:id', validarParametroId('id'), exigirRol('admin'), eliminarUsuario);

export default rutas;
