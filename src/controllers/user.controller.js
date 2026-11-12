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

const ROLES_USUARIO = ['user', 'admin'];
const ESTADOS_USUARIO = ['active', 'suspended', 'closed'];

// Oculta email y teléfono si el usuario no tiene relación finalizada o rol admin (RN05)
function sanitizeContactForRequester(usuario, solicitante, idsSociosLiberados) {
  const esAdmin = solicitante?.role === 'admin';
  const esPropioPerfil = solicitante && Number(solicitante.id) === Number(usuario.id);
  const estaLiberado = idsSociosLiberados?.has(Number(usuario.id));

  if (esAdmin || esPropioPerfil || estaLiberado) return usuario;

  return {
    ...usuario,
    email: null,
    phone: null,
    contactLocked: true,
  };
}

// Controlador CRUD de Usuarios y Perfiles
export function createUserController(deps = {}) {
  const users = deps.userModel || userModel;
  const hashFn = deps.hash || bcrypt.hash;

  // GET /api/usuarios - Listar usuarios del padrón
  const listUsers = asyncHandler(async (peticion, respuesta) => {
    const { role, status, search } = peticion.query;
    if (role) assertEnumValue(role, ROLES_USUARIO, 'role');
    if (status) assertEnumValue(status, ESTADOS_USUARIO, 'status');

    const filas = await users.findAll({ role, status, search });
    const idsSociosLiberados =
      peticion.user.role === 'admin' ? null : await users.getFinalizedPartnerIds(peticion.user.id);

    respuesta.status(200).json(filas.map((u) => sanitizeContactForRequester(u, peticion.user, idsSociosLiberados)));
  });

  // GET /api/usuarios/:id - Obtener detalle de un usuario
  const getUserById = asyncHandler(async (peticion, respuesta) => {
    const idObjetivo = parsePositiveId(peticion.params.id);
    const usuario = await users.findById(idObjetivo);
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');

    const idsSociosLiberados =
      peticion.user.role === 'admin' ? null : await users.getFinalizedPartnerIds(peticion.user.id);

    respuesta.status(200).json(sanitizeContactForRequester(usuario, peticion.user, idsSociosLiberados));
  });

  // POST /api/usuarios - Crear usuario (Solo Administrador)
  const createUser = asyncHandler(async (peticion, respuesta) => {
    requireFields(peticion.body, ['name', 'email', 'password']);

    const nombre = String(peticion.body.name).trim();
    const correo = String(peticion.body.email).trim().toLowerCase();
    const contrasena = String(peticion.body.password);
    const telefono = peticion.body.phone ? String(peticion.body.phone).trim() : '';
    const ciudad = peticion.body.city ? String(peticion.body.city).trim() : '';
    const rol = peticion.body.role || 'user';
    const estado = peticion.body.status || 'active';
    const reputacion = peticion.body.reputation !== undefined ? Number(peticion.body.reputation) : 5.0;

    if (nombre.length < 2) throw new AppError(400, 'El nombre debe tener al menos 2 caracteres.');
    if (!isValidEmail(correo)) throw new AppError(400, 'El correo electrónico no es válido.');
    if (contrasena.length < 6) throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres.');
    assertEnumValue(rol, ROLES_USUARIO, 'role');
    assertEnumValue(estado, ESTADOS_USUARIO, 'status');
    if (!Number.isFinite(reputacion) || reputacion < 1 || reputacion > 5) {
      throw new AppError(400, 'La reputación debe ubicarse entre 1.00 y 5.00.');
    }

    if (await users.existsByEmail(correo)) {
      throw new AppError(409, 'Ya existe un usuario registrado con ese correo.');
    }

    const contrasenaHash = await hashFn(contrasena, env.bcryptSaltRounds);
    const usuarioCreado = await users.create({
      name: nombre,
      email: correo,
      passwordHash: contrasenaHash,
      role: rol,
      phone: telefono,
      city: ciudad,
      status: estado,
      reputation: reputacion,
    });
    respuesta.status(201).json(usuarioCreado);
  });

  // PUT /api/usuarios/:id - Modificar datos de perfil o rol disciplinario (RN06)
  const updateUser = asyncHandler(async (peticion, respuesta) => {
    const idObjetivo = parsePositiveId(peticion.params.id);
    const usuarioExistente = await users.findById(idObjetivo);
    if (!usuarioExistente) throw new AppError(404, 'Usuario no encontrado.');

    const esAdmin = peticion.user.role === 'admin';
    const esPropioPerfil = Number(peticion.user.id) === Number(idObjetivo);
    if (!esAdmin && !esPropioPerfil) {
      throw new AppError(403, 'No tienes permisos para modificar otro usuario.');
    }

    // RN06: Solo un administrador puede modificar rol, estado disciplinario o reputación
    if (!esAdmin) {
      if (
        (peticion.body.role !== undefined && peticion.body.role !== usuarioExistente.role) ||
        (peticion.body.status !== undefined && peticion.body.status !== usuarioExistente.status) ||
        (peticion.body.reputation !== undefined && Number(peticion.body.reputation) !== Number(usuarioExistente.reputation))
      ) {
        throw new AppError(
          403,
          'RN06: Solo los administradores pueden modificar el rol, estado o reputación de una cuenta.'
        );
      }
    }

    const camposActualizados = {};
    if (peticion.body.name !== undefined) {
      const nombreLimpio = String(peticion.body.name).trim();
      if (nombreLimpio.length < 2) throw new AppError(400, 'El nombre debe tener al menos 2 caracteres.');
      camposActualizados.name = nombreLimpio;
    }
    if (peticion.body.email !== undefined) {
      const correoLimpio = String(peticion.body.email).trim().toLowerCase();
      if (!isValidEmail(correoLimpio)) throw new AppError(400, 'El correo electrónico no es válido.');
      if (await users.existsByEmail(correoLimpio, idObjetivo)) {
        throw new AppError(409, 'Ya existe otro usuario con ese correo electrónico.');
      }
      camposActualizados.email = correoLimpio;
    }
    if (peticion.body.phone !== undefined) camposActualizados.phone = String(peticion.body.phone).trim();
    if (peticion.body.city !== undefined) camposActualizados.city = String(peticion.body.city).trim();
    if (esAdmin && peticion.body.role !== undefined) camposActualizados.role = assertEnumValue(peticion.body.role, ROLES_USUARIO, 'role');
    if (esAdmin && peticion.body.status !== undefined) camposActualizados.status = assertEnumValue(peticion.body.status, ESTADOS_USUARIO, 'status');
    if (esAdmin && peticion.body.reputation !== undefined) {
      const rep = Number(peticion.body.reputation);
      if (!Number.isFinite(rep) || rep < 1 || rep > 5) throw new AppError(400, 'La reputación debe ubicarse entre 1.00 y 5.00.');
      camposActualizados.reputation = rep;
    }
    if (peticion.body.password !== undefined && String(peticion.body.password) !== '') {
      const nuevaContrasena = String(peticion.body.password);
      if (nuevaContrasena.length < 6) throw new AppError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
      camposActualizados.passwordHash = await hashFn(nuevaContrasena, env.bcryptSaltRounds);
    }

    const usuarioActualizado = await users.update(idObjetivo, camposActualizados);
    respuesta.status(200).json(usuarioActualizado);
  });

  // DELETE /api/usuarios/:id - Dar de baja cuenta
  const deleteUser = asyncHandler(async (peticion, respuesta) => {
    const idObjetivo = parsePositiveId(peticion.params.id);
    if (Number(peticion.user.id) === Number(idObjetivo)) {
      throw new AppError(400, 'No puedes eliminar tu propia cuenta activa.');
    }

    const usuarioExistente = await users.findById(idObjetivo);
    if (!usuarioExistente) throw new AppError(404, 'Usuario no encontrado.');

    await users.remove(idObjetivo);
    respuesta.status(200).json({ message: 'Usuario eliminado correctamente.', id: idObjetivo });
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
