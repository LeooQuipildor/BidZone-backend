import { consultar, ejecutarTransaccion } from '../config/baseDatos.js';
import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloPuja from '../modelos/puja.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirNumeroPositivo, leerIdPositivo } from '../middlewares/validar.middleware.js';
import { aFechaIso } from '../utilidades/fecha.js';

// GET /api/pujas - Lista pujas filtrando por subasta o postor
export const listarPujas = atraparErrores(async (req, res) => {
  const { subastaId, postorId } = req.query;

  const idSubasta = subastaId ? leerIdPositivo(subastaId) : undefined;
  if (subastaId && !idSubasta) throw new ErrorApi(400, 'subastaId debe ser un número positivo.');

  const idPostor = postorId ? leerIdPositivo(postorId) : undefined;
  if (postorId && !idPostor) throw new ErrorApi(400, 'postorId debe ser un número positivo.');

  const pujas = await modeloPuja.listarTodas({ subastaId: idSubasta, postorId: idPostor });
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
  exigirCampos(req.body, ['subastaId', 'monto']);

  const subastaId = leerIdPositivo(req.body.subastaId);
  if (!subastaId) throw new ErrorApi(400, 'subastaId debe ser un número positivo.');

  const monto = exigirNumeroPositivo(req.body.monto, 'monto');

  // RN04: El postor debe aceptar el compromiso vinculante de compra
  if (req.body.compromisoAceptado !== true) {
    throw new ErrorApi(400, 'RN04: Debes aceptar el compromiso vinculante de compra.');
  }

  const nota = req.body.nota ? String(req.body.nota).trim() : 'Compromiso de pago y retiro acordado.';
  await modeloSubasta.cerrarSubastasVencidas();

  const pujaCreada = await ejecutarTransaccion(async (conexion) => {
    const subasta = await modeloSubasta.buscarParaBloquear(conexion, subastaId);
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

    const liderAnterior = await modeloPuja.buscarOfertaLider(conexion, subastaId);
    const nuevaPuja = await modeloPuja.crear(conexion, {
      subastaId,
      postorId: req.usuario.id,
      monto,
      nota,
    });

    await consultar('UPDATE subastas SET precio_actual = ? WHERE id = ?', [monto, subastaId], conexion);

    // Avisa al postor anterior que su oferta fue superada
    if (liderAnterior && Number(liderAnterior.postorId) !== Number(req.usuario.id)) {
      await consultar(
        `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'superada')`,
        [
          liderAnterior.postorId,
          subastaId,
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

    const esAdmin = req.usuario.rol === 'admin';
    const esDueno = Number(actual.postorId) === Number(req.usuario.id);
    if (!esAdmin && !esDueno) throw new ErrorApi(403, 'No tienes permisos para editar esta puja.');

    if (!esAdmin && req.body.monto !== undefined && Number(req.body.monto) !== Number(actual.monto)) {
      throw new ErrorApi(403, 'RN04: El monto de una puja es irrevocable. Solo puedes editar la nota.');
    }

    const cambios = {};
    if (esAdmin && req.body.monto !== undefined) {
      cambios.monto = exigirNumeroPositivo(req.body.monto, 'monto');
    }
    if (req.body.nota !== undefined) cambios.nota = String(req.body.nota).trim();

    const guardada = await modeloPuja.actualizar(conexion, id, cambios);
    if (esAdmin && cambios.monto !== undefined) {
      await modeloPuja.recalcularPrecioSubasta(conexion, actual.subastaId);
    }
    return guardada;
  });

  res.status(200).json(actualizada);
});

// DELETE /api/pujas/:id - Elimina una puja y recalcula precio (solo administrador)
export const eliminarPuja = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  if (req.usuario.rol !== 'admin') {
    throw new ErrorApi(403, 'RN04: Un postor no puede anular sus pujas.');
  }

  await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloPuja.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Puja no encontrada.');
    await modeloPuja.eliminar(conexion, id);
    await modeloPuja.recalcularPrecioSubasta(conexion, actual.subastaId);
  });

  res.status(200).json({ mensaje: 'Puja eliminada y precio recalculado.', id });
});
