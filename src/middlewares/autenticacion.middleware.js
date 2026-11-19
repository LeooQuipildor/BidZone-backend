import * as modeloUsuario from '../modelos/usuario.model.js';
import { verificarJwt } from '../utilidades/token.js';
import { ErrorApi } from './errores.middleware.js';

// Lee el token que llega en la cabecera: "Authorization: Bearer <token>"
function obtenerTokenDeCabecera(req) {
  const cabecera = req.headers.authorization;
  if (!cabecera || typeof cabecera !== 'string') return null;
  const partes = cabecera.trim().split(/\s+/);
  if (partes.length !== 2 || partes[0].toLowerCase() !== 'bearer') return null;
  return partes[1];
}

// Middleware obligatorio: exige un token válido y que la cuenta esté activa (RN06)
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
    return next(error);
  }
}

// Middleware opcional: si hay token carga req.usuario, si no sigue como invitado
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

// Middleware de permisos: solo deja pasar a los roles indicados (ej. 'admin')
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
