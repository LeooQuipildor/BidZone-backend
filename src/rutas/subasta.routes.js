/**
 * ============================================================================
 * ARCHIVO: src/rutas/subasta.routes.js
 * PREFIJO: /api/subastas
 * ============================================================================
 * - Ver el catálogo (GET) es público, pero usa "autenticacionOpcional" para saber
 *   si quien mira es el vendedor o ganador y así liberar el contacto al cierre (RN05).
 * - Publicar, editar y eliminar (POST/PUT/DELETE) exigen sesión iniciada (verificarToken).
 */

import { Router } from 'express';
import {
  listarSubastas,
  obtenerSubasta,
  crearSubasta,
  actualizarSubasta,
  eliminarSubasta,
} from '../controladores/subasta.controller.js';
import { verificarToken, autenticacionOpcional } from '../middlewares/autenticacion.middleware.js';
import { validarParametroId } from '../middlewares/validar.middleware.js';

const rutas = Router();

rutas.get('/', autenticacionOpcional, listarSubastas);
rutas.get('/:id', validarParametroId('id'), autenticacionOpcional, obtenerSubasta);

rutas.post('/', verificarToken, crearSubasta);
rutas.put('/:id', validarParametroId('id'), verificarToken, actualizarSubasta);
rutas.patch('/:id', validarParametroId('id'), verificarToken, actualizarSubasta);
rutas.delete('/:id', validarParametroId('id'), verificarToken, eliminarSubasta);

export default rutas;
