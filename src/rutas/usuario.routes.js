/**
 * ============================================================================
 * ARCHIVO: src/rutas/usuario.routes.js
 * PREFIJO: /api/usuarios
 * ============================================================================
 * Todas las rutas de usuarios exigen sesión iniciada (verificarToken).
 * Crear y eliminar cuentas están restringidos solo al rol 'admin' (exigirRol('admin')).
 */

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
rutas.use(verificarToken); // Aplica verificación de token a todas las rutas de este archivo

rutas.get('/', listarUsuarios);                                              // Listar usuarios
rutas.get('/:id', validarParametroId('id'), obtenerUsuario);                 // Ver un usuario por ID
rutas.post('/', exigirRol('admin'), crearUsuario);                           // Crear cuenta (solo admin)
rutas.put('/:id', validarParametroId('id'), actualizarUsuario);              // Editar perfil o cuenta
rutas.patch('/:id', validarParametroId('id'), actualizarUsuario);            // Alias PATCH para editar
rutas.delete('/:id', validarParametroId('id'), exigirRol('admin'), eliminarUsuario); // Borrar (solo admin)

export default rutas;
