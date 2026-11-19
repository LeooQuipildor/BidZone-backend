/**
 * ============================================================================
 * ARCHIVO: src/rutas/autenticacion.routes.js
 * PREFIJO: /api/autenticacion
 * ============================================================================
 * Define las rutas para registrarse, iniciar sesión y consultar el perfil activo.
 */

import { Router } from 'express';
import { registrar, iniciarSesion, perfilActual } from '../controladores/autenticacion.controller.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';

const rutas = Router();

rutas.post('/registrar', registrar);                  // Pública: crea cuenta nueva
rutas.post('/iniciar-sesion', iniciarSesion);         // Pública: valida correo/contraseña y devuelve JWT
rutas.get('/perfil', verificarToken, perfilActual);   // Privada: exige token válido para devolver el usuario

export default rutas;
