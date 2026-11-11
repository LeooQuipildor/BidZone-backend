import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(user) {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno.');
  }
  return jwt.sign(
    {
      id: Number(user.id),
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function verifyJwtToken(token) {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno.');
  }
  return jwt.verify(token, env.jwtSecret);
}

