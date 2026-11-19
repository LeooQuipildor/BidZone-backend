import { consultar, ejecutarTransaccion } from '../config/baseDatos.js';
import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloPuja from '../modelos/puja.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirNumeroPositivo, leerIdPositivo } from '../middlewares/validar.middleware.js';
import { aFechaIso } from '../utilidades/fecha.js';

// GET /api/pujas - Lista pujas filtrando por subasta o postor
export const listarPujas = atraparErrores(async (req, res) => {
  const { auctionId, bidderId } = req.query;

  const idSubasta = auctionId ? leerIdPositivo(auctionId) : undefined;
  if (auctionId && !idSubasta) throw new ErrorApi(400, 'auctionId debe ser un número positivo.');

  const idPostor = bidderId ? leerIdPositivo(bidderId) : undefined;
  if (bidderId && !idPostor) throw new ErrorApi(400, 'bidderId debe ser un número positivo.');

  const pujas = await modeloPuja.listarTodas({ auctionId: idSubasta, bidderId: idPostor });
  res.status(200).json(pujas);
});

// GET /api/pujas/:id - Devuelve una puja por ID
export const obtenerPuja = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const puja = await modeloPuja.buscarPorId(id);
  if (!puja) throw new ErrorApi(404, 'Puja no encontrada.');
  res.status(200).json(puja);
});

// POST /api/pujas - Registra una oferta nueva validando RN01, RN02, RN03 y RN04
export const crearPuja = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['auctionId', 'amount']);

  const idSubasta = leerIdPositivo(req.body.auctionId);
  if (!idSubasta) throw new ErrorApi(400, 'auctionId debe ser un número positivo.');

  const monto = exigirNumeroPositivo(req.body.amount, 'amount');

  // RN04: El postor debe aceptar el compromiso vinculante de compra
  if (req.body.commitmentAccepted !== true) {
    throw new ErrorApi(400, 'RN04: Debes aceptar el compromiso vinculante de compra.');
  }

  const nota = req.body.note ? String(req.body.note).trim() : 'Compromiso de pago y retiro acordado.';
  await modeloSubasta.cerrarSubastasVencidas();

  const pujaCreada = await ejecutarTransaccion(async (conexion) => {
    const subasta = await modeloSubasta.buscarParaBloquear(conexion, idSubasta);
    if (!subasta) throw new ErrorApi(404, 'La subasta no existe.');

    // RN02: El vendedor no puede pujar en su propia subasta
    if (Number(subasta.vendedor_id) === Number(req.usuario.id)) {
      throw new ErrorApi(403, 'RN02: No puedes pujar en tu propia subasta.');
    }

    // RN03: Solo se aceptan ofertas si la subasta está activa y no venció
    const fechaFin = new Date(aFechaIso(subasta.fecha_fin)).getTime();
    if (subasta.estado !== 'activa' || fechaFin <= Date.now()) {
      throw new ErrorApi(409, 'RN03: La subasta ya finalizó o no está activa.');
    }

    // RN01: La oferta debe superar el precio actual + incremento mínimo
    const minimo = Number(subasta.precio_actual) + Number(subasta.incremento_minimo);
    if (monto < minimo) {
      throw new ErrorApi(400, `RN01: La oferta mínima es $${minimo.toLocaleString('es-AR')}.`);
    }

    const liderAnterior = await modeloPuja.buscarOfertaLider(conexion, idSubasta);
    const nuevaPuja = await modeloPuja.crear(conexion, {
      auctionId: idSubasta,
      bidderId: req.usuario.id,
      amount: monto,
      note: nota,
    });

    await consultar('UPDATE subastas SET precio_actual = ? WHERE id = ?', [monto, idSubasta], conexion);

    // Avisa al postor anterior que su oferta fue superada
    if (liderAnterior && Number(liderAnterior.bidderId) !== Number(req.usuario.id)) {
      await consultar(
        `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'outbid')`,
        [
          liderAnterior.bidderId,
          idSubasta,
          '¡Oferta superada!',
          `Tu oferta en "${subasta.titulo}" fue superada con $${monto.toLocaleString('es-AR')}.`,
        ],
        conexion
      );
    }

    return nuevaPuja;
  });

  res.status(201).json(pujaCreada);
});

// PUT /api/pujas/:id - Edita la nota de coordinación (RN04: el postor no puede cambiar el monto)
export const actualizarPuja = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);

  const actualizada = await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloPuja.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Puja no encontrada.');

    const esAdmin = req.usuario.role === 'admin';
    const esDueno = Number(actual.bidderId) === Number(req.usuario.id);
    if (!esAdmin && !esDueno) throw new ErrorApi(403, 'No tienes permisos para editar esta puja.');

    if (!esAdmin && req.body.amount !== undefined && Number(req.body.amount) !== Number(actual.amount)) {
      throw new ErrorApi(403, 'RN04: El monto de una puja es irrevocable. Solo puedes editar la nota.');
    }

    const cambios = {};
    if (esAdmin && req.body.amount !== undefined) {
      cambios.amount = exigirNumeroPositivo(req.body.amount, 'amount');
    }
    if (req.body.note !== undefined) cambios.note = String(req.body.note).trim();

    const guardada = await modeloPuja.actualizar(conexion, id, cambios);
    if (esAdmin && cambios.amount !== undefined) {
      await modeloPuja.recalcularPrecioSubasta(conexion, actual.auctionId);
    }
    return guardada;
  });

  res.status(200).json(actualizada);
});

// DELETE /api/pujas/:id - Elimina una puja y recalcula precio (solo administrador)
export const eliminarPuja = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  if (req.usuario.role !== 'admin') {
    throw new ErrorApi(403, 'RN04: Un postor no puede anular sus pujas.');
  }

  await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloPuja.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Puja no encontrada.');
    await modeloPuja.eliminar(conexion, id);
    await modeloPuja.recalcularPrecioSubasta(conexion, actual.auctionId);
  });

  res.status(200).json({ message: 'Puja eliminada y precio recalculado.', id });
});
