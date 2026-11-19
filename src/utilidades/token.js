import jwt from 'jsonwebtoken';
import { entorno } from '../config/entorno.js';

// Genera un token JWT con los datos básicos de la sesión del usuario
export function crearToken(usuario) {
  const secreto = process.env.JWT_SECRET || entorno.jwtSecreto;
  return jwt.sign(
    { id: Number(usuario.id), role: usuario.role, email: usuario.email },
    secreto,
    { expiresIn: entorno.jwtExpiraEn }
  );
}

// Verifica que el token sea válido y devuelve los datos guardados adentro
export function verificarJwt(token) {
  const secreto = process.env.JWT_SECRET || entorno.jwtSecreto;
  return jwt.verify(token, secreto);
}
