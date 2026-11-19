import bcrypt from 'bcryptjs';
import { entorno } from '../config/entorno.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import {
  esCorreoValido,
  exigirCampos,
  exigirValorPermitido,
  leerIdPositivo,
} from '../middlewares/validar.middleware.js';

const ROLES_VALIDOS = ['user', 'admin'];
const ESTADOS_VALIDOS = ['active', 'suspended', 'closed'];

// RN05: Oculta correo y teléfono si no es admin, ni perfil propio, ni socio de subasta finalizada
function ocultarContactoSiCorresponde(usuario, solicitante, idsLiberados) {
  const esAdmin = solicitante?.role === 'admin';
  const esPropio = Number(solicitante?.id) === Number(usuario.id);
  const estaLiberado = idsLiberados?.has(Number(usuario.id));

  if (esAdmin || esPropio || estaLiberado) return usuario;
  return { ...usuario, email: null, phone: null, contactLocked: true };
}

// GET /api/usuarios - Lista todos los usuarios con filtros opcionales
export const listarUsuarios = atraparErrores(async (req, res) => {
  const { role, status, search } = req.query;
  if (role) exigirValorPermitido(role, ROLES_VALIDOS, 'role');
  if (status) exigirValorPermitido(status, ESTADOS_VALIDOS, 'status');

  const usuarios = await modeloUsuario.listarTodos({ role, status, search });
  const idsLiberados =
    req.usuario.role === 'admin'
      ? null
      : await modeloUsuario.obtenerSociosConContactoLiberado(req.usuario.id);

  const resultado = usuarios.map((u) => ocultarContactoSiCorresponde(u, req.usuario, idsLiberados));
  res.status(200).json(resultado);
});

// GET /api/usuarios/:id - Devuelve un usuario por ID
export const obtenerUsuario = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const usuario = await modeloUsuario.buscarPorId(id);
  if (!usuario) throw new ErrorApi(404, 'Usuario no encontrado.');

  const idsLiberados =
    req.usuario.role === 'admin'
      ? null
      : await modeloUsuario.obtenerSociosConContactoLiberado(req.usuario.id);

  res.status(200).json(ocultarContactoSiCorresponde(usuario, req.usuario, idsLiberados));
});

// POST /api/usuarios - Crea un usuario nuevo (solo administrador)
export const crearUsuario = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['name', 'email', 'password']);

  const nombre = String(req.body.name).trim();
  const correo = String(req.body.email).trim().toLowerCase();
  const contrasena = String(req.body.password);
  const rol = req.body.role || 'user';
  const estado = req.body.status || 'active';

  if (nombre.length < 2) throw new ErrorApi(400, 'El nombre debe tener al menos 2 caracteres.');
  if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');
  if (contrasena.length < 6) throw new ErrorApi(400, 'La contraseña debe tener al menos 6 caracteres.');
  exigirValorPermitido(rol, ROLES_VALIDOS, 'role');
  exigirValorPermitido(estado, ESTADOS_VALIDOS, 'status');

  if (await modeloUsuario.existeCorreo(correo)) {
    throw new ErrorApi(409, 'Ya existe un usuario con ese correo.');
  }

  const usuarioCreado = await modeloUsuario.crear({
    name: nombre,
    email: correo,
    passwordHash: await bcrypt.hash(contrasena, entorno.rondasBcrypt),
    role: rol,
    status: estado,
    phone: req.body.phone ? String(req.body.phone).trim() : '',
    city: req.body.city ? String(req.body.city).trim() : '',
    reputation: req.body.reputation ?? 5.0,
  });

  res.status(201).json(usuarioCreado);
});

// PUT /api/usuarios/:id - Modifica perfil propio o cualquier usuario si es admin
export const actualizarUsuario = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloUsuario.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Usuario no encontrado.');

  const esAdmin = req.usuario.role === 'admin';
  const esPropio = Number(req.usuario.id) === Number(id);
  if (!esAdmin && !esPropio) throw new ErrorApi(403, 'No tienes permisos para modificar otro usuario.');

  // RN06: Solo un admin puede cambiar rol, estado o reputación
  const intentaCambiarAdmin =
    (req.body.role !== undefined && req.body.role !== actual.role) ||
    (req.body.status !== undefined && req.body.status !== actual.status) ||
    (req.body.reputation !== undefined && Number(req.body.reputation) !== Number(actual.reputation));

  if (!esAdmin && intentaCambiarAdmin) {
    throw new ErrorApi(403, 'RN06: Solo un administrador puede cambiar el rol, estado o reputación.');
  }

  const cambios = {};
  if (req.body.name !== undefined) {
    const nombre = String(req.body.name).trim();
    if (nombre.length < 2) throw new ErrorApi(400, 'El nombre debe tener al menos 2 caracteres.');
    cambios.name = nombre;
  }
  if (req.body.email !== undefined) {
    const correo = String(req.body.email).trim().toLowerCase();
    if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');
    if (await modeloUsuario.existeCorreo(correo, id)) throw new ErrorApi(409, 'Correo ya usado por otro usuario.');
    cambios.email = correo;
  }
  if (req.body.phone !== undefined) cambios.phone = String(req.body.phone).trim();
  if (req.body.city !== undefined) cambios.city = String(req.body.city).trim();
  if (esAdmin && req.body.role !== undefined) cambios.role = exigirValorPermitido(req.body.role, ROLES_VALIDOS, 'role');
  if (esAdmin && req.body.status !== undefined) cambios.status = exigirValorPermitido(req.body.status, ESTADOS_VALIDOS, 'status');
  if (esAdmin && req.body.reputation !== undefined) cambios.reputation = Number(req.body.reputation);
  if (req.body.password) {
    if (String(req.body.password).length < 6) throw new ErrorApi(400, 'La contraseña debe tener al menos 6 caracteres.');
    cambios.passwordHash = await bcrypt.hash(String(req.body.password), entorno.rondasBcrypt);
  }

  const actualizado = await modeloUsuario.actualizar(id, cambios);
  res.status(200).json(actualizado);
});

// DELETE /api/usuarios/:id - Elimina una cuenta (solo admin y no puede borrarse a sí mismo)
export const eliminarUsuario = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  if (Number(req.usuario.id) === Number(id)) {
    throw new ErrorApi(400, 'No puedes eliminar tu propia cuenta activa.');
  }

  const existe = await modeloUsuario.buscarPorId(id);
  if (!existe) throw new ErrorApi(404, 'Usuario no encontrado.');

  await modeloUsuario.eliminar(id);
  res.status(200).json({ message: 'Usuario eliminado correctamente.', id });
});
