import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloPuja from '../modelos/puja.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import {
  exigirCampos,
  exigirNumeroPositivo,
  exigirValorPermitido,
  leerIdPositivo,
} from '../middlewares/validar.middleware.js';
import { aFechaMySql } from '../utilidades/fecha.js';

const ESTADOS_SUBASTA = ['activa', 'finalizada', 'cancelada'];
const ORDENES_VALIDOS = ['endingSoon', 'priceAsc', 'priceDesc', 'newest'];
const IMAGEN_DEFECTO =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80';

// GET /api/subastas - Lista subastas con filtros y ordenamiento
export const listarSubastas = atraparErrores(async (req, res) => {
  await modeloSubasta.cerrarSubastasVencidas();
  const { category, status, search, sellerId, sortBy } = req.query;

  if (status && status !== 'todas') exigirValorPermitido(status, ESTADOS_SUBASTA, 'status');
  if (sortBy) exigirValorPermitido(sortBy, ORDENES_VALIDOS, 'sortBy');

  const idVendedor = sellerId ? leerIdPositivo(sellerId) : undefined;
  if (sellerId && !idVendedor) throw new ErrorApi(400, 'sellerId debe ser un número positivo.');

  const subastas = await modeloSubasta.listarTodas({ category, status, search, sellerId: idVendedor, sortBy });
  res.status(200).json(subastas);
});

// GET /api/subastas/:id - Detalle de subasta, pujas y contacto liberado al cierre (RN05)
export const obtenerSubasta = atraparErrores(async (req, res) => {
  await modeloSubasta.cerrarSubastasVencidas();
  const id = leerIdPositivo(req.params.id);
  const fila = await modeloSubasta.buscarDetalleCrudo(id);
  if (!fila) throw new ErrorApi(404, 'Subasta no encontrada.');

  // RN05: Solo vendedor, ganador o admin ven email y teléfono cuando la subasta ya finalizó
  const usuario = req.usuario;
  const esParteAutorizada =
    usuario &&
    (usuario.role === 'admin' ||
      Number(usuario.id) === Number(fila.vendedor_id) ||
      Number(usuario.id) === Number(fila.ganador_id));

  const contactoLiberado = Boolean(fila.estado === 'finalizada' && fila.ganador_id && esParteAutorizada);

  const vendedor = {
    id: Number(fila.vendedor_id),
    name: fila.vendedor_nombre,
    city: fila.vendedor_ciudad,
    reputation: Number(fila.vendedor_reputacion),
    ...(contactoLiberado ? { email: fila.vendedor_correo, phone: fila.vendedor_telefono } : {}),
  };

  const ganador = fila.ganador_id
    ? {
        id: Number(fila.ganador_id),
        name: fila.ganador_nombre,
        city: fila.ganador_ciudad,
        reputation: Number(fila.ganador_reputacion),
        ...(contactoLiberado ? { email: fila.ganador_correo, phone: fila.ganador_telefono } : {}),
      }
    : null;

  res.status(200).json({
    ...modeloSubasta.formatearSubasta(fila),
    bids: await modeloPuja.listarTodas({ auctionId: id }),
    seller: vendedor,
    winner: ganador,
    contactUnlocked: contactoLiberado,
  });
});

// POST /api/subastas - Publica una subasta nueva
export const crearSubasta = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['title', 'basePrice', 'minIncrement', 'endTime']);

  const titulo = String(req.body.title).trim();
  if (titulo.length < 3) throw new ErrorApi(400, 'El título debe tener al menos 3 caracteres.');

  const precioBase = exigirNumeroPositivo(req.body.basePrice, 'basePrice');
  const incrementoMinimo = exigirNumeroPositivo(req.body.minIncrement, 'minIncrement');
  const fechaCierre = aFechaMySql(req.body.endTime);

  if (!fechaCierre || new Date(req.body.endTime).getTime() <= Date.now()) {
    throw new ErrorApi(400, 'La fecha de cierre debe ser posterior al momento actual.');
  }

  let idVendedor = req.usuario.id;
  if (req.usuario.role === 'admin' && req.body.sellerId) {
    idVendedor = leerIdPositivo(req.body.sellerId) || idVendedor;
  }

  const creada = await modeloSubasta.crear({
    title: titulo,
    description: req.body.description ? String(req.body.description).trim() : '',
    category: req.body.category ? String(req.body.category).trim() : 'Tecnología',
    imageUrl: req.body.imageUrl?.trim() || IMAGEN_DEFECTO,
    basePrice: precioBase,
    minIncrement: incrementoMinimo,
    sellerId: idVendedor,
    endTime: fechaCierre,
  });

  res.status(201).json(creada);
});

// PUT /api/subastas/:id - Edita una subasta (RN08: bloquea precio/fecha si ya tiene pujas)
export const actualizarSubasta = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloSubasta.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Subasta no encontrada.');

  const esAdmin = req.usuario.role === 'admin';
  const esDueno = Number(actual.sellerId) === Number(req.usuario.id);
  if (!esAdmin && !esDueno) throw new ErrorApi(403, 'Solo el vendedor o un administrador puede editarla.');

  const cantidadPujas = await modeloSubasta.contarPujas(id);

  // RN08: Si ya hay pujas, el vendedor no puede cambiar precio base, incremento ni fecha
  if (cantidadPujas > 0 && !esAdmin) {
    if (req.body.basePrice !== undefined && Number(req.body.basePrice) !== Number(actual.basePrice)) {
      throw new ErrorApi(409, 'RN08: No puedes cambiar el precio base porque ya hay ofertas.');
    }
    if (req.body.minIncrement !== undefined && Number(req.body.minIncrement) !== Number(actual.minIncrement)) {
      throw new ErrorApi(409, 'RN08: No puedes cambiar el incremento mínimo porque ya hay ofertas.');
    }
    if (req.body.endTime !== undefined && aFechaMySql(req.body.endTime) !== aFechaMySql(actual.endTime)) {
      throw new ErrorApi(409, 'RN08: No puedes cambiar la fecha de cierre porque ya hay ofertas.');
    }
  }

  const cambios = {};
  if (req.body.title !== undefined) {
    const titulo = String(req.body.title).trim();
    if (titulo.length < 3) throw new ErrorApi(400, 'El título debe tener al menos 3 caracteres.');
    cambios.title = titulo;
  }
  if (req.body.description !== undefined) cambios.description = String(req.body.description).trim();
  if (req.body.category !== undefined) cambios.category = String(req.body.category).trim();
  if (req.body.imageUrl !== undefined) cambios.imageUrl = String(req.body.imageUrl).trim();
  if (req.body.basePrice !== undefined) {
    cambios.basePrice = exigirNumeroPositivo(req.body.basePrice, 'basePrice');
    if (cantidadPujas === 0) cambios.currentPrice = cambios.basePrice;
  }
  if (req.body.minIncrement !== undefined) {
    cambios.minIncrement = exigirNumeroPositivo(req.body.minIncrement, 'minIncrement');
  }
  if (req.body.endTime !== undefined) {
    const fecha = aFechaMySql(req.body.endTime);
    if (!fecha) throw new ErrorApi(400, 'La fecha de cierre no es válida.');
    cambios.endTime = fecha;
  }
  if (req.body.status !== undefined) {
    const nuevoEstado = exigirValorPermitido(req.body.status, ESTADOS_SUBASTA, 'status');
    if (nuevoEstado !== actual.status && nuevoEstado !== 'cancelada') {
      throw new ErrorApi(403, 'El cierre es automático al vencer el tiempo; solo puedes cancelar la subasta.');
    }
    if (nuevoEstado === 'cancelada' && cantidadPujas > 0 && !esAdmin) {
      throw new ErrorApi(409, 'No puedes cancelar una subasta que ya tiene pujas.');
    }
    cambios.status = nuevoEstado;
  }

  const actualizada = await modeloSubasta.actualizar(id, cambios);
  res.status(200).json(actualizada);
});

// DELETE /api/subastas/:id - Elimina una subasta (RN08: no si ya tiene pujas, salvo admin)
export const eliminarSubasta = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloSubasta.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Subasta no encontrada.');

  const esAdmin = req.usuario.role === 'admin';
  const esDueno = Number(actual.sellerId) === Number(req.usuario.id);
  if (!esAdmin && !esDueno) throw new ErrorApi(403, 'No tienes permisos para eliminar esta subasta.');

  if ((await modeloSubasta.contarPujas(id)) > 0 && !esAdmin) {
    throw new ErrorApi(409, 'RN08: No puedes eliminar una subasta que ya tiene pujas.');
  }

  await modeloSubasta.eliminar(id);
  res.status(200).json({ message: 'Subasta eliminada correctamente.', id });
});
