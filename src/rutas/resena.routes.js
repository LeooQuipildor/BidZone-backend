/**
 * ============================================================================
 * ARCHIVO: src/rutas/resena.routes.js
 * PREFIJO: /api/resenas
 * ============================================================================
 * Rutas de calificaciones mutuas (1 a 5 estrellas) post-cierre (RN07).
 */

import { Router } from 'express';
import {
  listarResenas,
  obtenerResena,
  crearResena,
  actualizarResena,
  eliminarResena,
} from '../controladores/resena.controller.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { validarParametroId } from '../middlewares/validar.middleware.js';

const rutas = Router();
rutas.use(verificarToken);

rutas.get('/', listarResenas);
rutas.get('/:id', validarParametroId('id'), obtenerResena);
rutas.post('/', crearResena);
rutas.put('/:id', validarParametroId('id'), actualizarResena);
rutas.patch('/:id', validarParametroId('id'), actualizarResena);
rutas.delete('/:id', validarParametroId('id'), eliminarResena);

export default rutas;
