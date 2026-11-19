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

// Catálogo público (con token opcional para liberar contacto RN05 al cierre)
rutas.get('/', autenticacionOpcional, listarSubastas);
rutas.get('/:id', validarParametroId('id'), autenticacionOpcional, obtenerSubasta);

// Acciones que requieren sesión iniciada
rutas.post('/', verificarToken, crearSubasta);
rutas.put('/:id', validarParametroId('id'), verificarToken, actualizarSubasta);
rutas.patch('/:id', validarParametroId('id'), verificarToken, actualizarSubasta);
rutas.delete('/:id', validarParametroId('id'), verificarToken, eliminarSubasta);

export default rutas;
