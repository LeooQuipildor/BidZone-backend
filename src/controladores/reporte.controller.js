import { consultar, ejecutarTransaccion } from '../config/baseDatos.js';
import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloReporte from '../modelos/reporte.model.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirValorPermitido, leerIdPositivo } from '../middlewares/validar.middleware.js';

const ESTADOS_REPORTE = ['en_revision', 'resuelto_sancion', 'desestimado'];
const ACCIONES_CUENTA = ['none', 'suspend', 'close', 'activate'];

// GET /api/reportes - Lista reportes (admin ve todos, usuario solo los suyos)
export const listarReportes = atraparErrores(async (req, res) => {
  const { status, auctionId } = req.query;
  if (status && status !== 'todos') exigirValorPermitido(status, ESTADOS_REPORTE, 'status');

  const idSubasta = auctionId ? leerIdPositivo(auctionId) : undefined;
  if (auctionId && !idSubasta) throw new ErrorApi(400, 'auctionId debe ser un número positivo.');

  const reportes = await modeloReporte.listarTodos({
    status,
    auctionId: idSubasta,
    participantUserId: req.usuario.role === 'admin' ? undefined : req.usuario.id,
  });
  res.status(200).json(reportes);
});

// GET /api/reportes/:id - Devuelve un expediente específico
export const obtenerReporte = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const reporte = await modeloReporte.buscarPorId(id);
  if (!reporte) throw new ErrorApi(404, 'Reporte no encontrado.');

  const esAdmin = req.usuario.role === 'admin';
  const participa =
    Number(reporte.reporterId) === Number(req.usuario.id) ||
    Number(reporte.reportedUserId) === Number(req.usuario.id);

  if (!esAdmin && !participa) throw new ErrorApi(403, 'No tienes permisos para ver este reporte.');
  res.status(200).json(reporte);
});

// POST /api/reportes - Abre un ticket de reporte y notifica al denunciado (RN06)
export const crearReporte = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['auctionId', 'reportedUserId', 'reason', 'description']);

  const idSubasta = leerIdPositivo(req.body.auctionId);
  const idDenunciado = leerIdPositivo(req.body.reportedUserId);
  if (!idSubasta || !idDenunciado) throw new ErrorApi(400, 'auctionId y reportedUserId deben ser números positivos.');
  if (idDenunciado === Number(req.usuario.id)) throw new ErrorApi(400, 'No puedes reportarte a ti mismo.');

  if (!(await modeloSubasta.buscarPorId(idSubasta))) throw new ErrorApi(404, 'La subasta no existe.');
  if (!(await modeloUsuario.buscarPorId(idDenunciado))) throw new ErrorApi(404, 'El usuario denunciado no existe.');

  const motivo = String(req.body.reason).trim();
  const reporteCreado = await ejecutarTransaccion(async (conexion) => {
    const reporte = await modeloReporte.crear(conexion, {
      auctionId: idSubasta,
      reporterId: req.usuario.id,
      reportedUserId: idDenunciado,
      reason: motivo,
      description: String(req.body.description).trim(),
      evidenceUrl: req.body.evidenceUrl ? String(req.body.evidenceUrl).trim() : '',
    });

    await consultar(
      `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'report')`,
      [idDenunciado, idSubasta, 'Nuevo reporte registrado', `Se abrió el ticket #${reporte.id} por "${motivo}".`],
      conexion
    );
    return reporte;
  });

  res.status(201).json(reporteCreado);
});

// PUT/PATCH /api/reportes/:id - Resuelve ticket y aplica sanción (Admin) o edita reclamo (Denunciante)
export const actualizarReporte = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  if (req.body.status !== undefined) exigirValorPermitido(req.body.status, ESTADOS_REPORTE, 'status');
  if (req.body.accountAction !== undefined) {
    exigirValorPermitido(req.body.accountAction, ACCIONES_CUENTA, 'accountAction');
  }

  const actualizado = await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloReporte.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Reporte no encontrado.');

    const esAdmin = req.usuario.role === 'admin';
    const esDenunciante = Number(actual.reporterId) === Number(req.usuario.id);
    if (!esAdmin && !esDenunciante) throw new ErrorApi(403, 'No tienes permisos para modificar este reporte.');

    if (!esAdmin) {
      const intentaSancionar =
        (req.body.status !== undefined && req.body.status !== actual.status) ||
        (req.body.sanctionApplied !== undefined && String(req.body.sanctionApplied).trim() !== actual.sanctionApplied) ||
        (req.body.accountAction !== undefined && req.body.accountAction !== 'none');

      if (intentaSancionar) throw new ErrorApi(403, 'RN06: Solo un administrador puede resolver o sancionar.');
      if (actual.status !== 'en_revision') throw new ErrorApi(409, 'Este reporte ya fue resuelto.');
    }

    const cambios = {};
    if (req.body.reason) cambios.reason = String(req.body.reason).trim();
    if (req.body.description) cambios.description = String(req.body.description).trim();
    if (req.body.evidenceUrl !== undefined) cambios.evidenceUrl = String(req.body.evidenceUrl).trim();
    if (esAdmin && req.body.status !== undefined) cambios.status = req.body.status;
    if (esAdmin && req.body.sanctionApplied !== undefined) {
      cambios.sanctionApplied = String(req.body.sanctionApplied).trim();
    }

    const guardado = await modeloReporte.actualizar(conexion, id, cambios);

    // RN06: Aplica suspensión, cierre o reactivación sobre la cuenta denunciada
    const accion = esAdmin ? req.body.accountAction : 'none';
    if (esAdmin && (guardado.status === 'resuelto_sancion' || accion === 'suspend' || accion === 'close')) {
      const nuevoEstado = accion === 'close' ? 'closed' : 'suspended';
      await consultar('UPDATE usuarios SET estado = ? WHERE id = ?', [nuevoEstado, guardado.reportedUserId], conexion);
      await consultar(
        `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'report')`,
        [
          guardado.reportedUserId,
          guardado.auctionId,
          'Resolución de reporte',
          `Tu cuenta pasó a estado "${nuevoEstado}" por el ticket #${guardado.id}: ${guardado.sanctionApplied}.`,
        ],
        conexion
      );
    } else if (esAdmin && accion === 'activate') {
      await consultar('UPDATE usuarios SET estado = ? WHERE id = ?', ['active', guardado.reportedUserId], conexion);
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
  res.status(200).json({ message: 'Reporte eliminado correctamente.', id });
});
