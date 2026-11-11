import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  isValidEmail,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';

const USER_ROLES = ['user', 'admin'];
const USER_STATUSES = ['active', 'suspended', 'closed'];

function sanitizeContactForRequester(user, requester, unlockedPartnerIds) {
  const isAdmin = requester?.role === 'admin';
  const isSelf = requester && Number(requester.id) === Number(user.id);
  const isUnlockedPartner = unlockedPartnerIds?.has(Number(user.id));

  if (isAdmin || isSelf || isUnlockedPartner) {
    return user;
  }

  // RN05: Ocultar datos de contacto directo salvo relación finalizada o rol admin
  return {
    ...user,
    email: null,
    phone: null,
    contactLocked: true,
  };
}

export function createUserController(deps = {}) {
  const users = deps.userModel || userModel;
  const hashFn = deps.hash || bcrypt.hash;

  const listUsers = asyncHandler(async (req, res) => {
    const { role, status, search } = req.query;
    if (role) assertEnumValue(role, USER_ROLES, 'role');
    if (status) assertEnumValue(status, USER_STATUSES, 'status');

    const rows = await users.findAll({ role, status, search });
    const unlockedPartnerIds =
      req.user.role === 'admin'
        ? null
        : await users.getFinalizedPartnerIds(req.user.id);

    const result = rows.map((u) =>
      sanitizeContactForRequester(u, req.user, unlockedPartnerIds)
    );
    res.status(200).json(result);
  });

  const getUserById = asyncHandler(async (req, res) => {
    const targetId = parsePositiveId(req.params.id);
    const user = await users.findById(targetId);
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado.');
    }

    const unlockedPartnerIds =
      req.user.role === 'admin'
        ? null
        : await users.getFinalizedPartnerIds(req.user.id);

    res
      .status(200)
      .json(sanitizeContactForRequester(user, req.user, unlockedPartnerIds));
  });

  const createUser = asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'email', 'password']);

    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const phone = req.body.phone ? String(req.body.phone).trim() : '';
    const city = req.body.city ? String(req.body.city).trim() : '';
    const role = req.body.role || 'user';
    const status = req.body.status || 'active';
    const reputation =
      req.body.reputation !== undefined ? Number(req.body.reputation) : 5.0;

    if (name.length < 2) {
      throw new AppError(400, 'El nombre debe tener al menos 2 caracteres.');
    }
    if (!isValidEmail(email)) {
      throw new AppError(400, 'El correo electrónico no es válido.');
    }
    if (password.length < 6) {
      throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres.');
    }
    assertEnumValue(role, USER_ROLES, 'role');
    assertEnumValue(status, USER_STATUSES, 'status');
    if (!Number.isFinite(reputation) || reputation < 1 || reputation > 5) {
      throw new AppError(400, 'La reputación debe ubicarse entre 1.00 y 5.00.');
    }

    if (await users.existsByEmail(email)) {
      throw new AppError(409, 'Ya existe un usuario registrado con ese correo.');
    }

    const passwordHash = await hashFn(password, env.bcryptSaltRounds);
    const created = await users.create({
      name,
      email,
      passwordHash,
      role,
      phone,
      city,
      status,
      reputation,
    });
    res.status(201).json(created);
  });

  const updateUser = asyncHandler(async (req, res) => {
    const targetId = parsePositiveId(req.params.id);
    const existing = await users.findById(targetId);
    if (!existing) {
      throw new AppError(404, 'Usuario no encontrado.');
    }

    const isAdmin = req.user.role === 'admin';
    const isSelf = Number(req.user.id) === Number(targetId);
    if (!isAdmin && !isSelf) {
      throw new AppError(403, 'No tienes permisos para modificar otro usuario.');
    }

    // RN06: Solo un administrador puede modificar rol, estado disciplinario o reputación
    if (!isAdmin) {
      if (
        (req.body.role !== undefined && req.body.role !== existing.role) ||
        (req.body.status !== undefined && req.body.status !== existing.status) ||
        (req.body.reputation !== undefined &&
          Number(req.body.reputation) !== Number(existing.reputation))
      ) {
        throw new AppError(
          403,
          'RN06: Solo los administradores pueden modificar el rol, estado o reputación de una cuenta.'
        );
      }
    }

    const updates = {};
    if (req.body.name !== undefined) {
      const cleanName = String(req.body.name).trim();
      if (cleanName.length < 2) {
        throw new AppError(400, 'El nombre debe tener al menos 2 caracteres.');
      }
      updates.name = cleanName;
    }

    if (req.body.email !== undefined) {
      const cleanEmail = String(req.body.email).trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        throw new AppError(400, 'El correo electrónico no es válido.');
      }
      if (await users.existsByEmail(cleanEmail, targetId)) {
        throw new AppError(409, 'Ya existe otro usuario con ese correo electrónico.');
      }
      updates.email = cleanEmail;
    }

    if (req.body.phone !== undefined) {
      updates.phone = String(req.body.phone).trim();
    }
    if (req.body.city !== undefined) {
      updates.city = String(req.body.city).trim();
    }
    if (isAdmin && req.body.role !== undefined) {
      updates.role = assertEnumValue(req.body.role, USER_ROLES, 'role');
    }
    if (isAdmin && req.body.status !== undefined) {
      updates.status = assertEnumValue(req.body.status, USER_STATUSES, 'status');
    }
    if (isAdmin && req.body.reputation !== undefined) {
      const rep = Number(req.body.reputation);
      if (!Number.isFinite(rep) || rep < 1 || rep > 5) {
        throw new AppError(400, 'La reputación debe ubicarse entre 1.00 y 5.00.');
      }
      updates.reputation = rep;
    }
    if (req.body.password !== undefined && String(req.body.password) !== '') {
      const newPassword = String(req.body.password);
      if (newPassword.length < 6) {
        throw new AppError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
      }
      updates.passwordHash = await hashFn(newPassword, env.bcryptSaltRounds);
    }

    const updated = await users.update(targetId, updates);
    res.status(200).json(updated);
  });

  const deleteUser = asyncHandler(async (req, res) => {
    const targetId = parsePositiveId(req.params.id);
    if (Number(req.user.id) === Number(targetId)) {
      throw new AppError(400, 'No puedes eliminar tu propia cuenta activa.');
    }

    const existing = await users.findById(targetId);
    if (!existing) {
      throw new AppError(404, 'Usuario no encontrado.');
    }

    await users.remove(targetId);
    res.status(200).json({
      message: 'Usuario eliminado correctamente.',
      id: targetId,
    });
  });

  return { listUsers, getUserById, createUser, updateUser, deleteUser };
}

export const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = createUserController();

