import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import { isValidEmail, requireFields } from '../middlewares/validate.middleware.js';
import { signToken } from '../utils/jwt.js';

// Controlador de Autenticación (Registro, Inicio de Sesión y Verificación de JWT)
export function createAuthController(deps = {}) {
  const users = deps.userModel || userModel;
  const hashFn = deps.hash || bcrypt.hash;
  const compareFn = deps.compare || bcrypt.compare;
  const signFn = deps.signToken || signToken;

  // POST /api/autenticacion/register - Registro de nuevos usuarios
  const register = asyncHandler(async (peticion, respuesta) => {
    // 1. Validar presencia de campos obligatorios
    requireFields(peticion.body, ['name', 'email', 'password']);

    const nombre = String(peticion.body.name).trim();
    const correo = String(peticion.body.email).trim().toLowerCase();
    const contrasena = String(peticion.body.password);
    const telefono = peticion.body.phone ? String(peticion.body.phone).trim() : '';
    const ciudad = peticion.body.city ? String(peticion.body.city).trim() : '';

    // 2. Validaciones de formato y longitud mínima
    if (nombre.length < 2) throw new AppError(400, 'El nombre debe tener al menos 2 caracteres.');
    if (!isValidEmail(correo)) throw new AppError(400, 'El correo electrónico ingresado no tiene un formato válido.');
    if (contrasena.length < 6) throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres.');

    // 3. Comprobar que el correo no esté registrado previamente
    const yaExiste = await users.existsByEmail(correo);
    if (yaExiste) throw new AppError(409, 'El correo electrónico ya se encuentra registrado.');

    // 4. Hashear la contraseña con bcrypt (costo 10)
    const contrasenaHash = await hashFn(contrasena, env.bcryptSaltRounds);

    // 5. Crear el usuario con rol estándar 'user' y reputación inicial 5.0
    const nuevoUsuario = await users.create({
      name: nombre,
      email: correo,
      passwordHash: contrasenaHash,
      role: 'user',
      phone: telefono,
      city: ciudad,
      status: 'active',
      reputation: 5.0,
    });

    // 6. Firmar y devolver el token JWT
    const token = signFn(nuevoUsuario);
    respuesta.status(201).json({ token, user: nuevoUsuario });
  });

  // POST /api/autenticacion/login - Inicio de sesión con credenciales
  const login = asyncHandler(async (peticion, respuesta) => {
    requireFields(peticion.body, ['email', 'password']);

    const correo = String(peticion.body.email).trim().toLowerCase();
    const contrasena = String(peticion.body.password);

    if (!isValidEmail(correo)) throw new AppError(400, 'El correo electrónico ingresado no tiene un formato válido.');

    // 1. Buscar el usuario en la base de datos por su correo
    const registroUsuario = await users.findAuthByEmail(correo);
    if (!registroUsuario) {
      throw new AppError(401, 'Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    // 2. Comparar el hash bcrypt de la contraseña
    const contrasenaValida = await compareFn(contrasena, registroUsuario.passwordHash);
    if (!contrasenaValida) {
      throw new AppError(401, 'Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    // 3. RN06: Bloquear acceso si la cuenta está suspendida o cerrada
    if (registroUsuario.status === 'suspended' || registroUsuario.status === 'closed') {
      throw new AppError(
        403,
        'RN06: Esta cuenta ha sido suspendida o cerrada por infracciones a las reglas de BidZone.'
      );
    }

    // 4. Omitir el hash de contraseña de la respuesta JSON
    const { passwordHash: _omitido, ...usuarioSeguro } = registroUsuario;
    const token = signFn(usuarioSeguro);
    respuesta.status(200).json({ token, user: usuarioSeguro });
  });

  // GET /api/autenticacion/me - Retorna el perfil autenticado actual
  const me = asyncHandler(async (peticion, respuesta) => {
    respuesta.status(200).json({ user: peticion.user });
  });

  return { register, login, me };
}

export const { register, login, me } = createAuthController();
