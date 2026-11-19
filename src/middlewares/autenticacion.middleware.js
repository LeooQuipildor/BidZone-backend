/**
 * ============================================================================
 * ARCHIVO: src/middlewares/autenticacion.middleware.js
 * ROL: Porteros de seguridad que protegen las rutas privadas de la API.
 * ============================================================================
 *
 * ¿QUÉ ES UN MIDDLEWARE EN EXPRESS?
 * Es una función que se ejecuta ANTES del controlador. Recibe (req, res, next):
 * - Si todo está bien, llama a "next()" para dejar pasar la petición al controlador.
 * - Si algo falla (ej: no hay token o la cuenta está suspendida), llama a
 *   "next(new ErrorApi(...))" para frenar la petición y devolver el error al cliente.
 */

import * as modeloUsuario from '../modelos/usuario.model.js';
import { verificarJwt } from '../utilidades/token.js';
import { ErrorApi } from './errores.middleware.js';

// Extrae el token de la cabecera HTTP: "Authorization: Bearer <token>"
function obtenerTokenDeCabecera(req) {
  const cabecera = req.headers.authorization;
  if (!cabecera || typeof cabecera !== 'string') return null;
  const partes = cabecera.trim().split(/\s+/);
  if (partes.length !== 2 || partes[0].toLowerCase() !== 'bearer') return null;
  return partes[1];
}

/**
 * Middleware OBLIGATORIO: se usa en rutas privadas (usuarios, pujas, reportes, etc.).
 * 1. Verifica que venga un token Bearer válido.
 * 2. Busca al usuario real en MySQL para asegurarse de que siga existiendo.
 * 3. RN06: Si la cuenta está 'suspendida' o 'cerrada', bloquea el paso con Error 403.
 * 4. Guarda el usuario en "req.usuario" para que el controlador sepa quién hizo la petición.
 */
export async function verificarToken(req, _res, next) {
  try {
    const token = obtenerTokenDeCabecera(req);
    if (!token) {
      return next(new ErrorApi(401, 'Acceso denegado. Debes iniciar sesión.'));
    }

    const datosToken = verificarJwt(token);
    const usuario = await modeloUsuario.buscarPorId(datosToken.id);
    if (!usuario) {
      return next(new ErrorApi(401, 'El usuario de esta sesión ya no existe.'));
    }

    if (usuario.estado !== 'activa') {
      return next(new ErrorApi(403, 'RN06: Esta cuenta está suspendida o cerrada.'));
    }

    req.usuario = usuario;
    return next();
  } catch (error) {
    // Si el token expiró o está alterado, verificarJwt() lanza error y lo pasamos a manejarErrores
    return next(error);
  }
}

/**
 * Middleware OPCIONAL: se usa en el catálogo público de subastas (GET /api/subastas).
 * Si el visitante está logueado carga "req.usuario" (útil para liberar contacto RN05),
 * y si es un visitante sin cuenta lo deja pasar con "req.usuario = null".
 */
export async function autenticacionOpcional(req, _res, next) {
  const token = obtenerTokenDeCabecera(req);
  if (!token) {
    req.usuario = null;
    return next();
  }
  try {
    const datosToken = verificarJwt(token);
    const usuario = await modeloUsuario.buscarPorId(datosToken.id);
    req.usuario = usuario && usuario.estado === 'activa' ? usuario : null;
  } catch {
    req.usuario = null;
  }
  return next();
}

/**
 * Middleware de ROLES: se coloca después de verificarToken (ej: exigirRol('admin')).
 * Bloquea con Error 403 si el rol del usuario conectado no está en la lista permitida.
 */
export function exigirRol(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.usuario) {
      return next(new ErrorApi(401, 'Debes iniciar sesión para continuar.'));
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new ErrorApi(403, 'No tienes permisos para realizar esta acción.'));
    }
    return next();
  };
}
