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
const ORDENES_VALIDOS = ['proximasACerrar', 'precioAsc', 'precioDesc', 'masRecientes'];
const IMAGEN_DEFECTO =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80';

// GET /api/subastas - Lista subastas con filtros y ordenamiento
export const listarSubastas = atraparErrores(async (req, res) => {
  await modeloSubasta.cerrarSubastasVencidas();
  const { categoria, estado, busqueda, vendedorId, ordenarPor } = req.query;

  if (estado && estado !== 'todas') exigirValorPermitido(estado, ESTADOS_SUBASTA, 'estado');
  if (ordenarPor) exigirValorPermitido(ordenarPor, ORDENES_VALIDOS, 'ordenarPor');

  const idVendedor = vendedorId ? leerIdPositivo(vendedorId) : undefined;
  if (vendedorId && !idVendedor) throw new ErrorApi(400, 'vendedorId debe ser un número positivo.');

  const subastas = await modeloSubasta.listarTodas({ categoria, estado, busqueda, vendedorId: idVendedor, ordenarPor });
  res.status(200).json(subastas);
});

// GET /api/subastas/:id - Detalle de subasta, pujas y contacto liberado al cierre (RN05)
export const obtenerSubasta = atraparErrores(async (req, res) => {
  await modeloSubasta.cerrarSubastasVencidas();
  const id = leerIdPositivo(req.params.id);
  const fila = await modeloSubasta.buscarDetalleCrudo(id);
  if (!fila) throw new ErrorApi(404, 'Subasta no encontrada.');

  // RN05: Solo vendedor, ganador o admin ven correo y teléfono cuando la subasta ya finalizó
  const usuario = req.usuario;
  const esParteAutorizada =
    usuario &&
    (usuario.rol === 'admin' ||
      Number(usuario.id) === Number(fila.vendedor_id) ||
      Number(usuario.id) === Number(fila.ganador_id));

  const contactoLiberado = Boolean(fila.estado === 'finalizada' && fila.ganador_id && esParteAutorizada);

  const vendedor = {
    id: Number(fila.vendedor_id),
    nombre: fila.vendedor_nombre,
    ciudad: fila.vendedor_ciudad,
    reputacion: Number(fila.vendedor_reputacion),
    ...(contactoLiberado ? { correo: fila.vendedor_correo, telefono: fila.vendedor_telefono } : {}),
  };

  const ganador = fila.ganador_id
    ? {
        id: Number(fila.ganador_id),
        nombre: fila.ganador_nombre,
        ciudad: fila.ganador_ciudad,
        reputacion: Number(fila.ganador_reputacion),
        ...(contactoLiberado ? { correo: fila.ganador_correo, telefono: fila.ganador_telefono } : {}),
      }
    : null;

  res.status(200).json({
    ...modeloSubasta.formatearSubasta(fila),
    pujas: await modeloPuja.listarTodas({ subastaId: id }),
    vendedor,
    ganador,
    contactoLiberado,
  });
});

// POST /api/subastas - Publica una subasta nueva
export const crearSubasta = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['titulo', 'precioBase', 'incrementoMinimo', 'fechaFin']);

  const titulo = String(req.body.titulo).trim();
  if (titulo.length < 3) throw new ErrorApi(400, 'El título debe tener al menos 3 caracteres.');

  const precioBase = exigirNumeroPositivo(req.body.precioBase, 'precioBase');
  const incrementoMinimo = exigirNumeroPositivo(req.body.incrementoMinimo, 'incrementoMinimo');
  const fechaFin = aFechaMySql(req.body.fechaFin);

  if (!fechaFin || new Date(req.body.fechaFin).getTime() <= Date.now()) {
    throw new ErrorApi(400, 'La fecha de cierre debe ser posterior al momento actual.');
  }

  let vendedorId = req.usuario.id;
  if (req.usuario.rol === 'admin' && req.body.vendedorId) {
    vendedorId = leerIdPositivo(req.body.vendedorId) || vendedorId;
  }

  const creada = await modeloSubasta.crear({
    titulo,
    descripcion: req.body.descripcion ? String(req.body.descripcion).trim() : '',
    categoria: req.body.categoria ? String(req.body.categoria).trim() : 'Tecnología',
    urlImagen: req.body.urlImagen?.trim() || IMAGEN_DEFECTO,
    precioBase,
    incrementoMinimo,
    vendedorId,
    fechaFin,
  });

  res.status(201).json(creada);
});

// PUT /api/subastas/:id - Edita una subasta (RN08: bloquea precio/fecha si ya tiene pujas)
export const actualizarSubasta = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloSubasta.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Subasta no encontrada.');

  const esAdmin = req.usuario.rol === 'admin';
  const esDueno = Number(actual.vendedorId) === Number(req.usuario.id);
  if (!esAdmin && !esDueno) throw new ErrorApi(403, 'Solo el vendedor o un administrador puede editarla.');

  const cantidadPujas = await modeloSubasta.contarPujas(id);

  // RN08: Si ya hay pujas, el vendedor no puede cambiar precio base, incremento ni fecha
  if (cantidadPujas > 0 && !esAdmin) {
    if (req.body.precioBase !== undefined && Number(req.body.precioBase) !== Number(actual.precioBase)) {
      throw new ErrorApi(409, 'RN08: No puedes cambiar el precio base porque ya hay ofertas.');
    }
    if (req.body.incrementoMinimo !== undefined && Number(req.body.incrementoMinimo) !== Number(actual.incrementoMinimo)) {
      throw new ErrorApi(409, 'RN08: No puedes cambiar el incremento mínimo porque ya hay ofertas.');
    }
    if (req.body.fechaFin !== undefined && aFechaMySql(req.body.fechaFin) !== aFechaMySql(actual.fechaFin)) {
      throw new ErrorApi(409, 'RN08: No puedes cambiar la fecha de cierre porque ya hay ofertas.');
    }
  }

  const cambios = {};
  if (req.body.titulo !== undefined) {
    const titulo = String(req.body.titulo).trim();
    if (titulo.length < 3) throw new ErrorApi(400, 'El título debe tener al menos 3 caracteres.');
    cambios.titulo = titulo;
  }
  if (req.body.descripcion !== undefined) cambios.descripcion = String(req.body.descripcion).trim();
  if (req.body.categoria !== undefined) cambios.categoria = String(req.body.categoria).trim();
  if (req.body.urlImagen !== undefined) cambios.urlImagen = String(req.body.urlImagen).trim();
  if (req.body.precioBase !== undefined) {
    cambios.precioBase = exigirNumeroPositivo(req.body.precioBase, 'precioBase');
    if (cantidadPujas === 0) cambios.precioActual = cambios.precioBase;
  }
  if (req.body.incrementoMinimo !== undefined) {
    cambios.incrementoMinimo = exigirNumeroPositivo(req.body.incrementoMinimo, 'incrementoMinimo');
  }
  if (req.body.fechaFin !== undefined) {
    const fecha = aFechaMySql(req.body.fechaFin);
    if (!fecha) throw new ErrorApi(400, 'La fecha de cierre no es válida.');
    cambios.fechaFin = fecha;
  }
  if (req.body.estado !== undefined) {
    const nuevoEstado = exigirValorPermitido(req.body.estado, ESTADOS_SUBASTA, 'estado');
    if (nuevoEstado !== actual.estado && nuevoEstado !== 'cancelada') {
      throw new ErrorApi(403, 'El cierre es automático al vencer el tiempo; solo puedes cancelar la subasta.');
    }
    if (nuevoEstado === 'cancelada' && cantidadPujas > 0 && !esAdmin) {
      throw new ErrorApi(409, 'No puedes cancelar una subasta que ya tiene pujas.');
    }
    cambios.estado = nuevoEstado;
  }

  const actualizada = await modeloSubasta.actualizar(id, cambios);
  res.status(200).json(actualizada);
});

// DELETE /api/subastas/:id - Elimina una subasta (RN08: no si ya tiene pujas, salvo admin)
export const eliminarSubasta = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloSubasta.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Subasta no encontrada.');

  const esAdmin = req.usuario.rol === 'admin';
  const esDueno = Number(actual.vendedorId) === Number(req.usuario.id);
  if (!esAdmin && !esDueno) throw new ErrorApi(403, 'No tienes permisos para eliminar esta subasta.');

  if ((await modeloSubasta.contarPujas(id)) > 0 && !esAdmin) {
    throw new ErrorApi(409, 'RN08: No puedes eliminar una subasta que ya tiene pujas.');
  }

  await modeloSubasta.eliminar(id);
  res.status(200).json({ mensaje: 'Subasta eliminada correctamente.', id });
});
