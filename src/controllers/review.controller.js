import { withTransaction } from '../config/db.js';
import * as auctionModel from '../models/auction.model.js';
import * as reviewModel from '../models/review.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';

const CONTEXTOS_ROL = ['comprador_a_vendedor', 'vendedor_a_comprador'];

function parseRating(valor) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > 5) {
    throw new AppError(400, 'La calificación debe ser un número entero entre 1 y 5 estrellas.');
  }
  return numero;
}

// Controlador de Calificaciones y Reputación Post-Cierre (RN07)
export function createReviewController(deps = {}) {
  const reviews = deps.reviewModel || reviewModel;
  const auctions = deps.auctionModel || auctionModel;
  const runTx = deps.withTransaction || withTransaction;

  // GET /api/resenas - Listar calificaciones
  const listReviews = asyncHandler(async (peticion, respuesta) => {
    const { auctionId, targetUserId, reviewerId } = peticion.query;

    const idSubastaNumerico = auctionId ? parsePositiveId(auctionId) : undefined;
    if (auctionId && !idSubastaNumerico) {
      throw new AppError(400, 'El filtro auctionId debe ser un entero positivo.');
    }

    const idDestinoNumerico = targetUserId ? parsePositiveId(targetUserId) : undefined;
    if (targetUserId && !idDestinoNumerico) {
      throw new AppError(400, 'El filtro targetUserId debe ser un entero positivo.');
    }

    const idAutorNumerico = reviewerId ? parsePositiveId(reviewerId) : undefined;
    if (reviewerId && !idAutorNumerico) {
      throw new AppError(400, 'El filtro reviewerId debe ser un entero positivo.');
    }

    const listado = await reviews.findAll({
      auctionId: idSubastaNumerico,
      targetUserId: idDestinoNumerico,
      reviewerId: idAutorNumerico,
    });
    respuesta.status(200).json(listado);
  });

  // GET /api/resenas/:id - Detalle de una calificación
  const getReviewById = asyncHandler(async (peticion, respuesta) => {
    const idResena = parsePositiveId(peticion.params.id);
    const resena = await reviews.findById(idResena);
    if (!resena) throw new AppError(404, 'Calificación no encontrada.');
    respuesta.status(200).json(resena);
  });

  // POST /api/resenas - Registrar calificación única entre partes (RN07)
  const createReview = asyncHandler(async (peticion, respuesta) => {
    requireFields(peticion.body, ['auctionId', 'rating']);

    const idSubasta = parsePositiveId(peticion.body.auctionId);
    if (!idSubasta) throw new AppError(400, 'El campo auctionId debe ser un entero positivo.');

    const puntuacion = parseRating(peticion.body.rating);
    const comentario = peticion.body.comment ? String(peticion.body.comment).trim() : '';

    const calificacionCreada = await runTx(async (conn) => {
      const subasta = await auctions.findById(idSubasta, conn);
      if (!subasta) throw new AppError(404, 'Subasta no encontrada.');

      // RN07: Calificación permitida únicamente tras el cierre formal con ganador
      if (subasta.status !== 'finalizada') {
        throw new AppError(409, 'RN07: Solo se pueden calificar subastas que hayan finalizado formalmente.');
      }
      if (!subasta.winnerId) {
        throw new AppError(409, 'RN07: Esta subasta finalizó sin ganador adjudicado, por lo que no admite calificación.');
      }

      const esAdmin = peticion.user.role === 'admin';
      const esGanador = Number(peticion.user.id) === Number(subasta.winnerId);
      const esVendedor = Number(peticion.user.id) === Number(subasta.sellerId);

      let idUsuarioDestino;
      let contextoRol;

      if (esGanador) {
        idUsuarioDestino = subasta.sellerId;
        contextoRol = 'comprador_a_vendedor';
      } else if (esVendedor) {
        idUsuarioDestino = subasta.winnerId;
        contextoRol = 'vendedor_a_comprador';
      } else if (esAdmin) {
        idUsuarioDestino = parsePositiveId(peticion.body.targetUserId);
        if (!idUsuarioDestino || idUsuarioDestino === Number(peticion.user.id)) {
          throw new AppError(400, 'Debes indicar un targetUserId válido distinto al autor.');
        }
        contextoRol = peticion.body.roleContext
          ? assertEnumValue(peticion.body.roleContext, CONTEXTOS_ROL, 'roleContext')
          : 'comprador_a_vendedor';
      } else {
        throw new AppError(403, 'RN07: Solo el vendedor o el comprador ganador pueden calificar esta operación.');
      }

      // RN07: Máximo una calificación por parte y subasta
      if (await reviews.existsByAuctionAndReviewer(conn, idSubasta, peticion.user.id)) {
        throw new AppError(409, 'RN07: Ya has emitido una calificación para esta operación.');
      }

      const calificacionGuardada = await reviews.create(conn, {
        auctionId: idSubasta,
        reviewerId: peticion.user.id,
        targetUserId: idUsuarioDestino,
        rating: puntuacion,
        comment: comentario,
        roleContext: contextoRol,
      });

      // Recalcular la reputación promedio del usuario calificado
      await reviews.recalculateUserReputation(conn, idUsuarioDestino);
      return calificacionGuardada;
    });

    respuesta.status(201).json(calificacionCreada);
  });

  // PUT /api/resenas/:id - Modificar comentario o puntuación de una reseña propia
  const updateReview = asyncHandler(async (peticion, respuesta) => {
    const idResena = parsePositiveId(peticion.params.id);

    const calificacionActualizada = await runTx(async (conn) => {
      const resenaExistente = await reviews.findById(idResena, conn);
      if (!resenaExistente) throw new AppError(404, 'Calificación no encontrada.');

      const esAdmin = peticion.user.role === 'admin';
      const esAutor = Number(resenaExistente.reviewerId) === Number(peticion.user.id);
      if (!esAdmin && !esAutor) {
        throw new AppError(403, 'Solo el autor de la reseña o un administrador puede editarla.');
      }

      const camposActualizados = {};
      if (peticion.body.rating !== undefined) camposActualizados.rating = parseRating(peticion.body.rating);
      if (peticion.body.comment !== undefined) camposActualizados.comment = String(peticion.body.comment).trim();
      if (esAdmin && peticion.body.roleContext !== undefined) {
        camposActualizados.roleContext = assertEnumValue(peticion.body.roleContext, CONTEXTOS_ROL, 'roleContext');
      }

      const calificacionGuardada = await reviews.update(conn, idResena, camposActualizados);
      await reviews.recalculateUserReputation(conn, resenaExistente.targetUserId);
      return calificacionGuardada;
    });

    respuesta.status(200).json(calificacionActualizada);
  });

  // DELETE /api/resenas/:id - Eliminar calificación
  const deleteReview = asyncHandler(async (peticion, respuesta) => {
    const idResena = parsePositiveId(peticion.params.id);

    await runTx(async (conn) => {
      const resenaExistente = await reviews.findById(idResena, conn);
      if (!resenaExistente) throw new AppError(404, 'Calificación no encontrada.');

      const esAdmin = peticion.user.role === 'admin';
      const esAutor = Number(resenaExistente.reviewerId) === Number(peticion.user.id);
      if (!esAdmin && !esAutor) {
        throw new AppError(403, 'Solo el autor de la reseña o un administrador puede eliminarla.');
      }

      await reviews.remove(conn, idResena);
      await reviews.recalculateUserReputation(conn, resenaExistente.targetUserId);
    });

    respuesta.status(200).json({ message: 'Calificación eliminada y reputación recalculada.', id: idResena });
  });

  return { listReviews, getReviewById, createReview, updateReview, deleteReview };
}

export const {
  listReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} = createReviewController();
