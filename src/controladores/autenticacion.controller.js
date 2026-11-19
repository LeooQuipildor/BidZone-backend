import bcrypt from 'bcryptjs';
import { entorno } from '../config/entorno.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { esCorreoValido, exigirCampos } from '../middlewares/validar.middleware.js';
import { crearToken } from '../utilidades/token.js';

// POST /api/autenticacion/register - Crea una cuenta nueva y devuelve token JWT
export const registrar = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['name', 'email', 'password']);

  const nombre = String(req.body.name).trim();
  const correo = String(req.body.email).trim().toLowerCase();
  const contrasena = String(req.body.password);

  if (nombre.length < 2) throw new ErrorApi(400, 'El nombre debe tener al menos 2 caracteres.');
  if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');
  if (contrasena.length < 6) throw new ErrorApi(400, 'La contraseña debe tener al menos 6 caracteres.');

  if (await modeloUsuario.existeCorreo(correo)) {
    throw new ErrorApi(409, 'El correo electrónico ya está registrado.');
  }

  const contrasenaHash = await bcrypt.hash(contrasena, entorno.rondasBcrypt);

  const nuevoUsuario = await modeloUsuario.crear({
    name: nombre,
    email: correo,
    passwordHash: contrasenaHash,
    phone: req.body.phone ? String(req.body.phone).trim() : '',
    city: req.body.city ? String(req.body.city).trim() : '',
  });

  const token = crearToken(nuevoUsuario);
  res.status(201).json({ token, user: nuevoUsuario });
});

// POST /api/autenticacion/login - Valida credenciales y devuelve token JWT
export const iniciarSesion = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['email', 'password']);

  const correo = String(req.body.email).trim().toLowerCase();
  const contrasena = String(req.body.password);

  if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');

  const usuario = await modeloUsuario.buscarParaLogin(correo);
  if (!usuario || !(await bcrypt.compare(contrasena, usuario.passwordHash))) {
    throw new ErrorApi(401, 'Credenciales inválidas. Verifica tu correo y contraseña.');
  }

  // RN06: Bloquear acceso a cuentas suspendidas o cerradas
  if (usuario.status !== 'active') {
    throw new ErrorApi(403, 'RN06: Esta cuenta está suspendida o cerrada.');
  }

  const { passwordHash: _oculto, ...usuarioSeguro } = usuario;
  const token = crearToken(usuarioSeguro);
  res.status(200).json({ token, user: usuarioSeguro });
});

// GET /api/autenticacion/me - Devuelve el usuario que está logueado
export const perfilActual = atraparErrores(async (req, res) => {
  res.status(200).json({ user: req.usuario });
});
