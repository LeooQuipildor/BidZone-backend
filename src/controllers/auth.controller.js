import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import { isValidEmail, requireFields } from '../middlewares/validate.middleware.js';
import { signToken } from '../utils/jwt.js';

export function createAuthController(deps = {}) {
  const users = deps.userModel || userModel;
  const hashFn = deps.hash || bcrypt.hash;
  const compareFn = deps.compare || bcrypt.compare;
  const signFn = deps.signToken || signToken;

  const register = asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'email', 'password']);

    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const phone = req.body.phone ? String(req.body.phone).trim() : '';
    const city = req.body.city ? String(req.body.city).trim() : '';

    if (name.length < 2) {
      throw new AppError(400, 'El nombre debe tener al menos 2 caracteres.');
    }
    if (!isValidEmail(email)) {
      throw new AppError(400, 'El correo electrónico ingresado no tiene un formato válido.');
    }
    if (password.length < 6) {
      throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres.');
    }

    const exists = await users.existsByEmail(email);
    if (exists) {
      throw new AppError(409, 'El correo electrónico ya se encuentra registrado.');
    }

    const passwordHash = await hashFn(password, env.bcryptSaltRounds);
    // El registro público siempre asigna rol estándar 'user' y estado 'active'
    const newUser = await users.create({
      name,
      email,
      passwordHash,
      role: 'user',
      phone,
      city,
      status: 'active',
      reputation: 5.0,
    });

    const token = signFn(newUser);
    res.status(201).json({ token, user: newUser });
  });

  const login = asyncHandler(async (req, res) => {
    requireFields(req.body, ['email', 'password']);

    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);

    if (!isValidEmail(email)) {
      throw new AppError(400, 'El correo electrónico ingresado no tiene un formato válido.');
    }

    const userRecord = await users.findAuthByEmail(email);
    if (!userRecord) {
      throw new AppError(401, 'Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    const validPassword = await compareFn(password, userRecord.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    if (userRecord.status === 'suspended' || userRecord.status === 'closed') {
      throw new AppError(
        403,
        'RN06: Esta cuenta ha sido suspendida o cerrada por infracciones a las reglas de BidZone.'
      );
    }

    const { passwordHash: _removed, ...safeUser } = userRecord;
    const token = signFn(safeUser);
    res.status(200).json({ token, user: safeUser });
  });

  const me = asyncHandler(async (req, res) => {
    res.status(200).json({ user: req.user });
  });

  return { register, login, me };
}

export const { register, login, me } = createAuthController();

