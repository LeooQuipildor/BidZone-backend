import { consultar, ejecutarTransaccion } from '../config/baseDatos.js';
import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloReporte from '../modelos/reporte.model.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirValorPermitido, leerIdPositivo } from '../middlewares/validar.middleware.js';

const ESTADOS_REPORTE = ['en_revision', 'resuelto_sancion', 'desestimado'];
const ACCIONES_CUENTA = ['ninguna', 'suspender', 'cerrar', 'activar'];

// GET /api/reportes - Lista reportes (admin ve todos, usuario solo los suyos)
export const listarReportes = atraparErrores(async (req, res) => {
  const { estado, subastaId } = req.query;
  if (estado && estado !== 'todos') exigirValorPermitido(estado, ESTADOS_REPORTE, 'estado');

  const idSubasta = subastaId ? leerIdPositivo(subastaId) : undefined;
  if (subastaId && !idSubasta) throw new ErrorApi(400, 'subastaId debe ser un número positivo.');

  const reportes = await modeloReporte.listarTodos({
    estado,
    subastaId: idSubasta,
    participanteId: req.usuario.rol === 'admin' ? undefined : req.usuario.id,
  });
  res.status(200).json(reportes);
});

// GET /api/reportes/:id - Devuelve un expediente específico
export const obtenerReporte = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const reporte = await modeloReporte.buscarPorId(id);
  if (!reporte) throw new ErrorApi(404, 'Reporte no encontrado.');

  const esAdmin = req.usuario.rol === 'admin';
  const participa =
    Number(reporte.denuncianteId) === Number(req.usuario.id) ||
    Number(reporte.denunciadoId) === Number(req.usuario.id);

  if (!esAdmin && !participa) throw new ErrorApi(403, 'No tienes permisos para ver este reporte.');
  res.status(200).json(reporte);
});

// POST /api/reportes - Abre un ticket de reporte y notifica al denunciado (RN06)
export const crearReporte = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['subastaId', 'denunciadoId', 'motivo', 'descripcion']);

  const subastaId = leerIdPositivo(req.body.subastaId);
  const denunciadoId = leerIdPositivo(req.body.denunciadoId);
  if (!subastaId || !denunciadoId) throw new ErrorApi(400, 'subastaId y denunciadoId deben ser números positivos.');
  if (denunciadoId === Number(req.usuario.id)) throw new ErrorApi(400, 'No puedes reportarte a ti mismo.');

  if (!(await modeloSubasta.buscarPorId(subastaId))) throw new ErrorApi(404, 'La subasta no existe.');
  if (!(await modeloUsuario.buscarPorId(denunciadoId))) throw new ErrorApi(404, 'El usuario denunciado no existe.');

  const motivo = String(req.body.motivo).trim();
  const reporteCreado = await ejecutarTransaccion(async (conexion) => {
    const reporte = await modeloReporte.crear(conexion, {
      subastaId,
      denuncianteId: req.usuario.id,
      denunciadoId,
      motivo,
      descripcion: String(req.body.descripcion).trim(),
      urlEvidencia: req.body.urlEvidencia ? String(req.body.urlEvidencia).trim() : '',
    });

    await consultar(
      `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'reporte')`,
      [denunciadoId, subastaId, 'Nuevo reporte registrado', `Se abrió el ticket #${reporte.id} por "${motivo}".`],
      conexion
    );
    return reporte;
  });

  res.status(201).json(reporteCreado);
});

// PUT/PATCH /api/reportes/:id - Resuelve ticket y aplica sanción (Admin) o edita reclamo (Denunciante)
export const actualizarReporte = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  if (req.body.estado !== undefined) exigirValorPermitido(req.body.estado, ESTADOS_REPORTE, 'estado');
  if (req.body.accionCuenta !== undefined) {
    exigirValorPermitido(req.body.accionCuenta, ACCIONES_CUENTA, 'accionCuenta');
  }

  const actualizado = await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloReporte.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Reporte no encontrado.');

    const esAdmin = req.usuario.rol === 'admin';
    const esDenunciante = Number(actual.denuncianteId) === Number(req.usuario.id);
    if (!esAdmin && !esDenunciante) throw new ErrorApi(403, 'No tienes permisos para modificar este reporte.');

    if (!esAdmin) {
      const intentaSancionar =
        (req.body.estado !== undefined && req.body.estado !== actual.estado) ||
        (req.body.sancionAplicada !== undefined && String(req.body.sancionAplicada).trim() !== actual.sancionAplicada) ||
        (req.body.accionCuenta !== undefined && req.body.accionCuenta !== 'ninguna');

      if (intentaSancionar) throw new ErrorApi(403, 'RN06: Solo un administrador puede resolver o sancionar.');
      if (actual.estado !== 'en_revision') throw new ErrorApi(409, 'Este reporte ya fue resuelto.');
    }

    const cambios = {};
    if (req.body.motivo) cambios.motivo = String(req.body.motivo).trim();
    if (req.body.descripcion) cambios.descripcion = String(req.body.descripcion).trim();
    if (req.body.urlEvidencia !== undefined) cambios.urlEvidencia = String(req.body.urlEvidencia).trim();
    if (esAdmin && req.body.estado !== undefined) cambios.estado = req.body.estado;
    if (esAdmin && req.body.sancionAplicada !== undefined) {
      cambios.sancionAplicada = String(req.body.sancionAplicada).trim();
    }

    const guardado = await modeloReporte.actualizar(conexion, id, cambios);

    // RN06: Aplica suspensión, cierre o reactivación sobre la cuenta denunciada
    const accion = esAdmin ? req.body.accionCuenta : 'ninguna';
    if (esAdmin && (guardado.estado === 'resuelto_sancion' || accion === 'suspender' || accion === 'cerrar')) {
      const nuevoEstado = accion === 'cerrar' ? 'cerrada' : 'suspendida';
      await consultar('UPDATE usuarios SET estado = ? WHERE id = ?', [nuevoEstado, guardado.denunciadoId], conexion);
      await consultar(
        `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'reporte')`,
        [
          guardado.denunciadoId,
          guardado.subastaId,
          'Resolución de reporte',
          `Tu cuenta pasó a estado "${nuevoEstado}" por el ticket #${guardado.id}: ${guardado.sancionAplicada}.`,
        ],
        conexion
      );
    } else if (esAdmin && accion === 'activar') {
      await consultar('UPDATE usuarios SET estado = ? WHERE id = ?', ['activa', guardado.denunciadoId], conexion);
    }

    return guardado;
  });

  res.status(200).json(actualizado);
});

// DELETE /api/reportes/:id - Elimina un reporte (solo administrador)
export const eliminarReporte = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloReporte.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Reporte no encontrado.');

  await modeloReporte.eliminar(id);
  res.status(200).json({ mensaje: 'Reporte eliminado correctamente.', id });
});
