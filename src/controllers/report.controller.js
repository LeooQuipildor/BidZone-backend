import { query, withTransaction } from '../config/db.js';
import * as auctionModel from '../models/auction.model.js';
import * as reportModel from '../models/report.model.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';

const ESTADOS_REPORTE = ['en_revision', 'resuelto_sancion', 'desestimado'];
const ACCIONES_CUENTA = ['none', 'suspend', 'close', 'activate'];

// Controlador de tickets de reporte y mediación de infracciones (RN06)
export function createReportController(deps = {}) {
  const reports = deps.reportModel || reportModel;
  const auctions = deps.auctionModel || auctionModel;
  const users = deps.userModel || userModel;
  const runTx = deps.withTransaction || withTransaction;
  const runQuery = deps.query || query;

  // GET /api/reportes - Listar reportes (Admin ve todos; usuario ve solo donde participa)
  const listReports = asyncHandler(async (peticion, respuesta) => {
    const { status, auctionId } = peticion.query;
    if (status && status !== 'todos') assertEnumValue(status, ESTADOS_REPORTE, 'status');

    const idSubastaNumerico = auctionId ? parsePositiveId(auctionId) : undefined;
    if (auctionId && !idSubastaNumerico) {
      throw new AppError(400, 'El filtro auctionId debe ser un entero positivo.');
    }

    const listado = await reports.findAll({
      status,
      auctionId: idSubastaNumerico,
      participantUserId: peticion.user.role === 'admin' ? undefined : peticion.user.id,
    });
    respuesta.status(200).json(listado);
  });

  // GET /api/reportes/:id - Consultar un expediente específico
  const getReportById = asyncHandler(async (peticion, respuesta) => {
    const idReporte = parsePositiveId(peticion.params.id);
    const reporte = await reports.findById(idReporte);
    if (!reporte) throw new AppError(404, 'Reporte no encontrado.');

    const esAdmin = peticion.user.role === 'admin';
    const participaEnReporte =
      Number(reporte.reporterId) === Number(peticion.user.id) ||
      Number(reporte.reportedUserId) === Number(peticion.user.id);

    if (!esAdmin && !participaEnReporte) {
      throw new AppError(403, 'No tienes permisos para ver este expediente de reporte.');
    }
    respuesta.status(200).json(reporte);
  });

  // POST /api/reportes - Crear un nuevo ticket de reporte (RN06)
  const createReport = asyncHandler(async (peticion, respuesta) => {
    requireFields(peticion.body, ['auctionId', 'reportedUserId', 'reason', 'description']);

    const idSubasta = parsePositiveId(peticion.body.auctionId);
    const idDenunciado = parsePositiveId(peticion.body.reportedUserId);
    if (!idSubasta || !idDenunciado) {
      throw new AppError(400, 'auctionId y reportedUserId deben ser enteros positivos válidos.');
    }
    if (Number(idDenunciado) === Number(peticion.user.id)) {
      throw new AppError(400, 'No puedes generar un reporte en tu propia contra.');
    }

    const motivo = String(peticion.body.reason).trim();
    const descripcion = String(peticion.body.description).trim();
    const urlEvidencia = peticion.body.evidenceUrl ? String(peticion.body.evidenceUrl).trim() : '';

    const subasta = await auctions.findById(idSubasta);
    if (!subasta) throw new AppError(404, 'La subasta referenciada no existe.');

    const usuarioDenunciado = await users.findById(idDenunciado);
    if (!usuarioDenunciado) throw new AppError(404, 'El usuario denunciado no existe.');

    const reporteCreado = await runTx(async (conn) => {
      const reporte = await reports.create(conn, {
        auctionId: idSubasta,
        reporterId: peticion.user.id,
        reportedUserId: idDenunciado,
        reason: motivo,
        description: descripcion,
        evidenceUrl: urlEvidencia,
        status: 'en_revision',
        sanctionApplied: 'Pendiente de evaluación',
      });

      await runQuery(
        `INSERT INTO notifications (user_id, auction_id, title, message, type) VALUES (?, ?, ?, ?, 'report')`,
        [
          idDenunciado,
          idSubasta,
          'Nuevo reporte de incumplimiento registrado',
          `Se ha abierto un expediente de mediación (#${reporte.id}) por "${motivo}".`,
        ],
        conn
      );

      return reporte;
    });

    respuesta.status(201).json(reporteCreado);
  });

  // PATCH /api/reportes/:id - Resolver ticket (Admin) o editar evidencia (Denunciante)
  const updateReport = asyncHandler(async (peticion, respuesta) => {
    const idReporte = parsePositiveId(peticion.params.id);
    if (peticion.body.status !== undefined) assertEnumValue(peticion.body.status, ESTADOS_REPORTE, 'status');
    if (peticion.body.accountAction !== undefined) assertEnumValue(peticion.body.accountAction, ACCIONES_CUENTA, 'accountAction');

    const reporteActualizado = await runTx(async (conn) => {
      const reporteExistente = await reports.findById(idReporte, conn);
      if (!reporteExistente) throw new AppError(404, 'Reporte no encontrado.');

      const esAdmin = peticion.user.role === 'admin';
      const esDenunciante = Number(reporteExistente.reporterId) === Number(peticion.user.id);
      if (!esAdmin && !esDenunciante) {
        throw new AppError(403, 'No tienes permisos para modificar este reporte.');
      }

      if (!esAdmin) {
        if (
          (peticion.body.status !== undefined && peticion.body.status !== reporteExistente.status) ||
          (peticion.body.sanctionApplied !== undefined && String(peticion.body.sanctionApplied).trim() !== reporteExistente.sanctionApplied) ||
          (peticion.body.accountAction !== undefined && peticion.body.accountAction !== 'none')
        ) {
          throw new AppError(403, 'RN06: Solo un administrador puede resolver el expediente o aplicar sanciones disciplinarias.');
        }
        if (reporteExistente.status !== 'en_revision') {
          throw new AppError(409, 'Este expediente ya fue resuelto y no puede ser modificado.');
        }
      }

      const camposActualizados = {};
      if (peticion.body.reason) camposActualizados.reason = String(peticion.body.reason).trim();
      if (peticion.body.description) camposActualizados.description = String(peticion.body.description).trim();
      if (peticion.body.evidenceUrl !== undefined) camposActualizados.evidenceUrl = String(peticion.body.evidenceUrl).trim();
      if (esAdmin && peticion.body.status !== undefined) camposActualizados.status = peticion.body.status;
      if (esAdmin && peticion.body.sanctionApplied !== undefined) camposActualizados.sanctionApplied = String(peticion.body.sanctionApplied).trim();

      const reporteGuardado = await reports.update(conn, idReporte, camposActualizados);

      // RN06: Si el administrador dictaminó sanción, actualizamos el estado de la cuenta del infractor
      const accionDisciplinaria = esAdmin ? peticion.body.accountAction : 'none';
      if (esAdmin && (reporteGuardado.status === 'resuelto_sancion' || accionDisciplinaria === 'suspend' || accionDisciplinaria === 'close')) {
        const nuevoEstado = accionDisciplinaria === 'close' ? 'closed' : 'suspended';
        await runQuery('UPDATE users SET status = ? WHERE id = ?', [nuevoEstado, reporteGuardado.reportedUserId], conn);
        await runQuery(
          `INSERT INTO notifications (user_id, auction_id, title, message, type) VALUES (?, ?, ?, ?, 'report')`,
          [
            reporteGuardado.reportedUserId,
            reporteGuardado.auctionId,
            'Resolución de expediente disciplinario',
            `Tu cuenta cambió al estado "${nuevoEstado}" tras el expediente #${reporteGuardado.id}: ${reporteGuardado.sanctionApplied}.`,
          ],
          conn
        );
      } else if (esAdmin && accionDisciplinaria === 'activate') {
        await runQuery('UPDATE users SET status = ? WHERE id = ?', ['active', reporteGuardado.reportedUserId], conn);
      }

      return reporteGuardado;
    });

    respuesta.status(200).json(reporteActualizado);
  });

  // DELETE /api/reportes/:id - Eliminar reporte
  const deleteReport = asyncHandler(async (peticion, respuesta) => {
    const idReporte = parsePositiveId(peticion.params.id);
    const reporteExistente = await reports.findById(idReporte);
    if (!reporteExistente) throw new AppError(404, 'Reporte no encontrado.');

    await reports.remove(idReporte);
    respuesta.status(200).json({ message: 'Reporte eliminado correctamente.', id: idReporte });
  });

  return { listReports, getReportById, createReport, updateReport, deleteReport };
}

export const {
  listReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} = createReportController();
