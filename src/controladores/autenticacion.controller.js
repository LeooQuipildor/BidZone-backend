import bcrypt from 'bcryptjs';
import { entorno } from '../config/entorno.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { esCorreoValido, exigirCampos } from '../middlewares/validar.middleware.js';
import { crearToken } from '../utilidades/token.js';

// POST /api/autenticacion/registrar - Crea una cuenta nueva y devuelve token JWT
export const registrar = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['nombre', 'correo', 'contrasena']);

  const nombre = String(req.body.nombre).trim();
  const correo = String(req.body.correo).trim().toLowerCase();
  const contrasena = String(req.body.contrasena);

  if (nombre.length < 2) throw new ErrorApi(400, 'El nombre debe tener al menos 2 caracteres.');
  if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');
  if (contrasena.length < 6) throw new ErrorApi(400, 'La contraseña debe tener al menos 6 caracteres.');

  if (await modeloUsuario.existeCorreo(correo)) {
    throw new ErrorApi(409, 'El correo electrónico ya está registrado.');
  }

  const contrasenaHash = await bcrypt.hash(contrasena, entorno.rondasBcrypt);

  const nuevoUsuario = await modeloUsuario.crear({
    nombre,
    correo,
    contrasenaHash,
    telefono: req.body.telefono ? String(req.body.telefono).trim() : '',
    ciudad: req.body.ciudad ? String(req.body.ciudad).trim() : '',
  });

  const token = crearToken(nuevoUsuario);
  res.status(201).json({ token, usuario: nuevoUsuario });
});

// POST /api/autenticacion/iniciar-sesion - Valida credenciales y devuelve token JWT
export const iniciarSesion = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['correo', 'contrasena']);

  const correo = String(req.body.correo).trim().toLowerCase();
  const contrasena = String(req.body.contrasena);

  if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');

  const usuario = await modeloUsuario.buscarParaLogin(correo);
  if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasenaHash))) {
    throw new ErrorApi(401, 'Credenciales inválidas. Verifica tu correo y contraseña.');
  }

  // RN06: Bloquear acceso a cuentas suspendidas o cerradas
  if (usuario.estado !== 'activa') {
    throw new ErrorApi(403, 'RN06: Esta cuenta está suspendida o cerrada.');
  }

  const { contrasenaHash: _oculto, ...usuarioSeguro } = usuario;
  const token = crearToken(usuarioSeguro);
  res.status(200).json({ token, usuario: usuarioSeguro });
});

// GET /api/autenticacion/perfil - Devuelve el usuario que está logueado
export const perfilActual = atraparErrores(async (req, res) => {
  res.status(200).json({ usuario: req.usuario });
});
