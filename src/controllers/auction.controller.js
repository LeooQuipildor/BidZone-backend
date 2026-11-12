import * as auctionModel from '../models/auction.model.js';
import * as bidModel from '../models/bid.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  assertPositiveNumber,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';
import { toMySqlUtcDatetime } from '../utils/date.js';

const ESTADOS_SUBASTA = ['activa', 'finalizada', 'cancelada'];
const ORDENES_SUBASTA = ['endingSoon', 'priceAsc', 'priceDesc', 'newest'];
const IMAGEN_POR_DEFECTO =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80';

// Controlador principal de Subastas (conecta HTTP con la base de datos)
export function createAuctionController(deps = {}) {
  const auctions = deps.auctionModel || auctionModel;
  const bids = deps.bidModel || bidModel;

  // GET /api/subastas - Listar subastas con filtros y orden
  const listAuctions = asyncHandler(async (peticion, respuesta) => {
    await auctions.syncExpiredAuctions();
    const { category, status, search, sellerId, sortBy } = peticion.query;

    if (status && status !== 'todas') assertEnumValue(status, ESTADOS_SUBASTA, 'status');
    if (sortBy) assertEnumValue(sortBy, ORDENES_SUBASTA, 'sortBy');

    const idVendedorNumerico = sellerId ? parsePositiveId(sellerId) : undefined;
    if (sellerId && !idVendedorNumerico) {
      throw new AppError(400, 'El filtro sellerId debe ser un entero positivo.');
    }

    const listado = await auctions.findAll({
      category,
      status,
      search,
      sellerId: idVendedorNumerico,
      sortBy,
    });
    respuesta.status(200).json(listado);
  });

  // GET /api/subastas/:id - Detalle de subasta con historial y contacto liberado (RN05)
  const getAuctionById = asyncHandler(async (peticion, respuesta) => {
    await auctions.syncExpiredAuctions();
    const idSubasta = parsePositiveId(peticion.params.id);
    const filaSubasta = await auctions.findByIdRaw(idSubasta);
    if (!filaSubasta) throw new AppError(404, 'Subasta no encontrada.');

    // RN05: Solo el vendedor y el postor ganador ven datos de contacto tras finalizar
    const esAdmin = peticion.user?.role === 'admin';
    const esVendedor = Number(peticion.user?.id) === Number(filaSubasta.seller_id);
    const esGanador = Number(peticion.user?.id) === Number(filaSubasta.winner_id);
    const contactoLiberado =
      filaSubasta.status === 'finalizada' &&
      filaSubasta.winner_id !== null &&
      peticion.user &&
      (esAdmin || esVendedor || esGanador);

    const vendedor = {
      id: Number(filaSubasta.seller_id),
      name: filaSubasta.seller_name,
      city: filaSubasta.seller_city,
      reputation: Number(filaSubasta.seller_reputation),
      ...(contactoLiberado ? { email: filaSubasta.seller_email, phone: filaSubasta.seller_phone } : {}),
    };

    const ganador = filaSubasta.winner_id
      ? {
          id: Number(filaSubasta.winner_id),
          name: filaSubasta.winner_name,
          city: filaSubasta.winner_city,
          reputation: Number(filaSubasta.winner_reputation),
          ...(contactoLiberado ? { email: filaSubasta.winner_email, phone: filaSubasta.winner_phone } : {}),
        }
      : null;

    respuesta.status(200).json({
      ...auctions.mapAuctionRow(filaSubasta),
      bids: await bids.findAll({ auctionId: idSubasta }),
      seller: vendedor,
      winner: ganador,
      contactUnlocked: Boolean(contactoLiberado),
    });
  });

  // POST /api/subastas - Crear y publicar una nueva subasta activa
  const createAuction = asyncHandler(async (peticion, respuesta) => {
    requireFields(peticion.body, ['title', 'basePrice', 'minIncrement', 'endTime']);

    const titulo = String(peticion.body.title).trim();
    if (titulo.length < 3) throw new AppError(400, 'El título debe tener al menos 3 caracteres.');

    const precioBase = assertPositiveNumber(peticion.body.basePrice, 'basePrice');
    const incrementoMinimo = assertPositiveNumber(peticion.body.minIncrement, 'minIncrement');
    const fechaCierreSql = toMySqlUtcDatetime(peticion.body.endTime);

    if (!fechaCierreSql || new Date(peticion.body.endTime).getTime() <= Date.now()) {
      throw new AppError(400, 'La fecha de cierre debe ser posterior al momento actual.');
    }

    let idVendedor = peticion.user.id;
    if (peticion.user.role === 'admin' && peticion.body.sellerId !== undefined) {
      idVendedor = parsePositiveId(peticion.body.sellerId) || idVendedor;
    }

    const subastaCreada = await auctions.create({
      title: titulo,
      description: peticion.body.description ? String(peticion.body.description).trim() : '',
      category: peticion.body.category ? String(peticion.body.category).trim() : 'Tecnología',
      imageUrl: peticion.body.imageUrl?.trim() || IMAGEN_POR_DEFECTO,
      basePrice: precioBase,
      minIncrement: incrementoMinimo,
      sellerId: idVendedor,
      status: 'activa',
      endTime: fechaCierreSql,
    });

    respuesta.status(201).json(subastaCreada);
  });

  // PUT /api/subastas/:id - Actualizar subasta (RN08: Bloqueo de condiciones con ofertas)
  const updateAuction = asyncHandler(async (peticion, respuesta) => {
    const idSubasta = parsePositiveId(peticion.params.id);
    const subastaExistente = await auctions.findById(idSubasta);
    if (!subastaExistente) throw new AppError(404, 'Subasta no encontrada.');

    const esAdmin = peticion.user.role === 'admin';
    const esPropietario = Number(subastaExistente.sellerId) === Number(peticion.user.id);
    if (!esAdmin && !esPropietario) {
      throw new AppError(403, 'Solo el vendedor propietario o un administrador puede editar esta subasta.');
    }

    const cantidadPujas = await auctions.countBids(idSubasta);

    // RN08: Si ya hay ofertas registradas, impedir cambios de precio base, incremento o fecha
    if (cantidadPujas > 0 && !esAdmin) {
      if (peticion.body.basePrice !== undefined && Number(peticion.body.basePrice) !== Number(subastaExistente.basePrice)) {
        throw new AppError(409, 'RN08: No se puede modificar el precio base porque la subasta ya cuenta con ofertas registradas.');
      }
      if (peticion.body.minIncrement !== undefined && Number(peticion.body.minIncrement) !== Number(subastaExistente.minIncrement)) {
        throw new AppError(409, 'RN08: No se puede modificar el incremento mínimo porque la subasta ya tiene ofertas activas.');
      }
      if (peticion.body.endTime !== undefined) {
        const siguienteFin = toMySqlUtcDatetime(peticion.body.endTime);
        const finActual = toMySqlUtcDatetime(subastaExistente.endTime);
        if (siguienteFin !== finActual) {
          throw new AppError(409, 'RN08: No se puede alterar la fecha de cierre una vez recibidas ofertas.');
        }
      }
    }

    const camposActualizados = {};
    if (peticion.body.title !== undefined) {
      const tituloLimpio = String(peticion.body.title).trim();
      if (tituloLimpio.length < 3) throw new AppError(400, 'El título debe tener al menos 3 caracteres.');
      camposActualizados.title = tituloLimpio;
    }
    if (peticion.body.description !== undefined) camposActualizados.description = String(peticion.body.description).trim();
    if (peticion.body.category !== undefined) camposActualizados.category = String(peticion.body.category).trim();
    if (peticion.body.imageUrl !== undefined) camposActualizados.imageUrl = String(peticion.body.imageUrl).trim();
    if (peticion.body.basePrice !== undefined) {
      const siguienteBase = assertPositiveNumber(peticion.body.basePrice, 'basePrice');
      camposActualizados.basePrice = siguienteBase;
      if (cantidadPujas === 0) camposActualizados.currentPrice = siguienteBase;
    }
    if (peticion.body.minIncrement !== undefined) {
      camposActualizados.minIncrement = assertPositiveNumber(peticion.body.minIncrement, 'minIncrement');
    }
    if (peticion.body.endTime !== undefined) {
      const siguienteFin = toMySqlUtcDatetime(peticion.body.endTime);
      if (!siguienteFin) throw new AppError(400, 'La fecha de cierre (endTime) no es válida.');
      camposActualizados.endTime = siguienteFin;
    }
    if (peticion.body.status !== undefined) {
      const siguienteEstado = assertEnumValue(peticion.body.status, ESTADOS_SUBASTA, 'status');
      if (siguienteEstado !== subastaExistente.status && siguienteEstado !== 'cancelada') {
        throw new AppError(403, 'No se puede finalizar manualmente una subasta; el cierre ocurre automáticamente al vencer su plazo. Solo es posible cancelarla.');
      }
      if (siguienteEstado === 'cancelada' && cantidadPujas > 0 && !esAdmin) {
        throw new AppError(409, 'No puedes cancelar una subasta que ya tiene pujas activas.');
      }
      camposActualizados.status = siguienteEstado;
    }

    const subastaActualizada = await auctions.update(idSubasta, camposActualizados);
    respuesta.status(200).json(subastaActualizada);
  });

  // DELETE /api/subastas/:id - Eliminar o cancelar subasta
  const deleteAuction = asyncHandler(async (peticion, respuesta) => {
    const idSubasta = parsePositiveId(peticion.params.id);
    const subastaExistente = await auctions.findById(idSubasta);
    if (!subastaExistente) throw new AppError(404, 'Subasta no encontrada.');

    const esAdmin = peticion.user.role === 'admin';
    const esPropietario = Number(subastaExistente.sellerId) === Number(peticion.user.id);
    if (!esAdmin && !esPropietario) throw new AppError(403, 'No tienes permisos para eliminar esta subasta.');

    const cantidadPujas = await auctions.countBids(idSubasta);
    if (cantidadPujas > 0 && !esAdmin) {
      throw new AppError(409, 'RN08: No puedes eliminar una subasta que ya tiene pujas registradas.');
    }

    await auctions.remove(idSubasta);
    respuesta.status(200).json({ message: 'Subasta eliminada correctamente.', id: idSubasta });
  });

  return { listAuctions, getAuctionById, createAuction, updateAuction, deleteAuction };
}

export const {
  listAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
} = createAuctionController();
