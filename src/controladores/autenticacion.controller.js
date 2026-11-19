/**
 * ============================================================================
 * ARCHIVO: src/controladores/autenticacion.controller.js
 * ROL: Controlador de registro, inicio de sesión y verificación de sesión activa.
 * ============================================================================
 *
 * ¿CÓMO SE CONECTA CON EL FRONTEND?
 * - Cuando alguien completa el formulario de Registro en React -> POST /api/autenticacion/registrar
 * - Cuando alguien inicia sesión en React -> POST /api/autenticacion/iniciar-sesion
 * - Cuando React recarga la página (F5) y revisa si el token sigue válido -> GET /api/autenticacion/perfil
 */

import bcrypt from 'bcryptjs';
import { entorno } from '../config/entorno.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { esCorreoValido, exigirCampos } from '../middlewares/validar.middleware.js';
import { crearToken } from '../utilidades/token.js';

/**
 * POST /api/autenticacion/registrar
 * Paso a paso:
 * 1. Verifica que lleguen nombre, correo y contraseña en req.body.
 * 2. Valida longitud mínima y formato de correo.
 * 3. Comprueba en MySQL que el correo no esté repetido (si existe -> 409 Conflict).
 * 4. Encripta la contraseña con bcrypt (nunca se guarda en texto plano).
 * 5. Crea el usuario en MySQL y devuelve código 201 + token JWT + datos del usuario.
 */
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

  // Encriptación irreversible con bcrypt (costo 10 rondas)
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

/**
 * POST /api/autenticacion/iniciar-sesion
 * Paso a paso:
 * 1. Lee correo y contraseña desde req.body.
 * 2. Busca al usuario en MySQL (trayendo su hash) y lo compara con bcrypt.compare().
 * 3. RN06: Si la cuenta está 'suspendida' o 'cerrada', impide ingresar (403 Forbidden).
 * 4. Usa destructuring para quitar "contrasenaHash" antes de enviar la respuesta.
 * 5. Firma un token JWT y devuelve { token, usuario }.
 */
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

  // Quitamos contrasenaHash usando destructuring para nunca enviarlo al navegador
  const { contrasenaHash: _oculto, ...usuarioSeguro } = usuario;
  const token = crearToken(usuarioSeguro);
  res.status(200).json({ token, usuario: usuarioSeguro });
});

/**
 * GET /api/autenticacion/perfil
 * El middleware "verificarToken" ya validó el JWT y cargó el usuario en "req.usuario",
 * así que este controlador solo lo devuelve en JSON.
 */
export const perfilActual = atraparErrores(async (req, res) => {
  res.status(200).json({ usuario: req.usuario });
});
