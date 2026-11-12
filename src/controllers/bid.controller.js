import { query, withTransaction } from '../config/db.js';
import * as auctionModel from '../models/auction.model.js';
import * as bidModel from '../models/bid.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertPositiveNumber,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';
import { toIsoUtc } from '../utils/date.js';

// Controlador de Pujas y Ofertas en Vivo (RN01, RN02, RN03, RN04)
export function createBidController(deps = {}) {
  const auctions = deps.auctionModel || auctionModel;
  const bids = deps.bidModel || bidModel;
  const runTx = deps.withTransaction || withTransaction;
  const runQuery = deps.query || query;

  // GET /api/pujas - Listar ofertas registradas
  const listBids = asyncHandler(async (peticion, respuesta) => {
    const { auctionId, bidderId } = peticion.query;

    const idSubastaNumerico = auctionId ? parsePositiveId(auctionId) : undefined;
    if (auctionId && !idSubastaNumerico) {
      throw new AppError(400, 'El filtro auctionId debe ser un entero positivo.');
    }

    const idPostorNumerico = bidderId ? parsePositiveId(bidderId) : undefined;
    if (bidderId && !idPostorNumerico) {
      throw new AppError(400, 'El filtro bidderId debe ser un entero positivo.');
    }

    const listado = await bids.findAll({
      auctionId: idSubastaNumerico,
      bidderId: idPostorNumerico,
    });
    respuesta.status(200).json(listado);
  });

  // GET /api/pujas/:id - Consultar una puja por su identificador
  const getBidById = asyncHandler(async (peticion, respuesta) => {
    const idPuja = parsePositiveId(peticion.params.id);
    const puja = await bids.findById(idPuja);
    if (!puja) throw new AppError(404, 'Puja no encontrada.');
    respuesta.status(200).json(puja);
  });

  // POST /api/pujas - Registrar oferta en vivo dentro de transacción SQL
  const createBid = asyncHandler(async (peticion, respuesta) => {
    requireFields(peticion.body, ['auctionId', 'amount']);

    const idSubasta = parsePositiveId(peticion.body.auctionId);
    if (!idSubasta) throw new AppError(400, 'El campo auctionId debe ser un entero positivo.');

    const montoNumerico = assertPositiveNumber(peticion.body.amount, 'amount');

    // RN04: Compromiso vinculante de compra obligatorio
    if (peticion.body.commitmentAccepted !== true) {
      throw new AppError(400, 'RN04: Debes aceptar el compromiso vinculante de compra para registrar la puja.');
    }

    const nota = peticion.body.note ? String(peticion.body.note).trim() : 'Compromiso de pago y retiro acordado.';

    // Sincronizar subastas vencidas antes de abrir la transacción
    await auctions.syncExpiredAuctions();

    const pujaCreada = await runTx(async (conn) => {
      const subasta = await auctions.findByIdForUpdate(conn, idSubasta);
      if (!subasta) throw new AppError(404, 'La subasta seleccionada no existe.');

      // RN02: Prohibición estricta de auto-puja
      if (Number(subasta.seller_id) === Number(peticion.user.id)) {
        throw new AppError(403, 'RN02: No puedes realizar ofertas sobre una subasta publicada por ti mismo.');
      }

      // RN03: La subasta debe estar activa y su fecha de cierre no debe haber expirado
      const fechaFinMs = new Date(toIsoUtc(subasta.end_time)).getTime();
      if (subasta.status !== 'activa' || fechaFinMs <= Date.now()) {
        throw new AppError(409, 'RN03: La subasta ya no se encuentra activa o su tiempo ha expirado.');
      }

      // RN01: La oferta debe ser mayor o igual al precio actual más el incremento mínimo
      const minimoPermitido = Number(subasta.current_price) + Number(subasta.min_increment);
      if (montoNumerico < minimoPermitido) {
        throw new AppError(
          400,
          `RN01: La oferta debe ser de al menos $${minimoPermitido.toLocaleString('es-AR')} (Precio actual + incremento mínimo).`
        );
      }

      const liderAnterior = await bids.findTopBidByAuction(conn, idSubasta);

      const nuevaPuja = await bids.create(conn, {
        auctionId: idSubasta,
        bidderId: peticion.user.id,
        amount: montoNumerico,
        note: nota,
        commitmentAccepted: true,
      });

      // Actualizar precio actual de la subasta
      await runQuery('UPDATE auctions SET current_price = ? WHERE id = ?', [montoNumerico, idSubasta], conn);

      // Notificar al postor líder que acaba de ser superado
      if (liderAnterior && Number(liderAnterior.bidderId) !== Number(peticion.user.id)) {
        await runQuery(
          `INSERT INTO notifications (user_id, auction_id, title, message, type) VALUES (?, ?, ?, ?, 'outbid')`,
          [
            liderAnterior.bidderId,
            idSubasta,
            '¡Oferta superada!',
            `Tu oferta en "${subasta.title}" fue superada con una puja de $${montoNumerico.toLocaleString('es-AR')}.`,
          ],
          conn
        );
      }

      return nuevaPuja;
    });

    respuesta.status(201).json(pujaCreada);
  });

  // PUT /api/pujas/:id - Modificar nota de coordinación (RN04: Monto irrevocable para el postor)
  const updateBid = asyncHandler(async (peticion, respuesta) => {
    const idPuja = parsePositiveId(peticion.params.id);

    const pujaActualizada = await runTx(async (conn) => {
      const pujaExistente = await bids.findById(idPuja, conn);
      if (!pujaExistente) throw new AppError(404, 'Puja no encontrada.');

      const esAdmin = peticion.user.role === 'admin';
      const esPropietario = Number(pujaExistente.bidderId) === Number(peticion.user.id);
      if (!esAdmin && !esPropietario) {
        throw new AppError(403, 'No tienes permisos para modificar esta puja.');
      }

      // RN04: El monto ofertado es irrevocable para el postor titular
      if (!esAdmin && peticion.body.amount !== undefined && Number(peticion.body.amount) !== Number(pujaExistente.amount)) {
        throw new AppError(
          403,
          'RN04: Las pujas son vinculantes e irrevocables. Como postor solo puedes editar la nota de coordinación; el importe no puede alterarse.'
        );
      }

      const camposActualizados = {};
      if (esAdmin && peticion.body.amount !== undefined) {
        camposActualizados.amount = assertPositiveNumber(peticion.body.amount, 'amount');
      }
      if (peticion.body.note !== undefined) {
        camposActualizados.note = String(peticion.body.note).trim();
      }

      const pujaGuardada = await bids.update(conn, idPuja, camposActualizados);
      if (esAdmin && camposActualizados.amount !== undefined) {
        await bids.recalculateAuctionPrice(conn, pujaExistente.auctionId);
      }
      return pujaGuardada;
    });

    respuesta.status(200).json(pujaActualizada);
  });

  // DELETE /api/pujas/:id - Eliminar puja (Solo Administrador)
  const deleteBid = asyncHandler(async (peticion, respuesta) => {
    const idPuja = parsePositiveId(peticion.params.id);
    if (peticion.user.role !== 'admin') {
      throw new AppError(403, 'RN04: Las pujas registradas no pueden ser anuladas por el postor.');
    }

    await runTx(async (conn) => {
      const pujaExistente = await bids.findById(idPuja, conn);
      if (!pujaExistente) throw new AppError(404, 'Puja no encontrada.');

      await bids.remove(conn, idPuja);
      await bids.recalculateAuctionPrice(conn, pujaExistente.auctionId);
    });

    respuesta.status(200).json({ message: 'Puja eliminada y precio actual recalculado.', id: idPuja });
  });

  return { listBids, getBidById, createBid, updateBid, deleteBid };
}

export const {
  listBids,
  getBidById,
  createBid,
  updateBid,
  deleteBid,
} = createBidController();
