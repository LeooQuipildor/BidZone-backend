/**
 * ============================================================================
 * ARCHIVO: src/utilidades/token.js
 * ROL: Crea y verifica los tokens JWT (credenciales de sesión).
 * ============================================================================
 *
 * ¿CÓMO FUNCIONA UN JWT (JSON Web Token)?
 * Cuando un usuario inicia sesión correctamente, el backend le entrega un texto
 * firmado con "JWT_SECRET" que contiene su id, rol y correo.
 * En cada petición futura, el frontend reenvía ese token y "verificarJwt()"
 * comprueba que no haya sido modificado ni haya expirado.
 */

import jwt from 'jsonwebtoken';
import { entorno } from '../config/entorno.js';

// Genera un token JWT firmado con los datos mínimos de sesión del usuario
export function crearToken(usuario) {
  const secreto = process.env.JWT_SECRET || entorno.jwtSecreto;
  return jwt.sign(
    { id: Number(usuario.id), rol: usuario.rol, correo: usuario.correo },
    secreto,
    { expiresIn: entorno.jwtExpiraEn } // Ej: '8h' (después de 8 horas vence automáticamente)
  );
}

// Comprueba que la firma sea legítima y devuelve { id, rol, correo }; si es inválido lanza un error
export function verificarJwt(token) {
  const secreto = process.env.JWT_SECRET || entorno.jwtSecreto;
  return jwt.verify(token, secreto);
}
