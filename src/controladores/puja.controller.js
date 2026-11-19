/**
 * ============================================================================
 * ARCHIVO: src/controladores/puja.controller.js
 * ROL: Corazón de las ofertas en vivo (valida RN01, RN02, RN03 y RN04 en transacción SQL).
 * ============================================================================
 *
 * ¿POR QUÉ "crearPuja" USA UNA TRANSACCIÓN SQL CON "FOR UPDATE"?
 * Imagina que dos usuarios ofertan al mismo milisegundo sobre la misma subasta.
 * Sin bloqueo, ambos leerían el mismo precio viejo y ambos podrían guardarse mal.
 * Con "ejecutarTransaccion" + "buscarParaBloquear (FOR UPDATE)":
 *   1. MySQL bloquea la fila de la subasta para la primera petición.
 *   2. Valida RN01/RN02/RN03, inserta la puja, actualiza precio_actual y avisa al líder anterior.
 *   3. Recién al hacer COMMIT se libera la fila para la segunda petición, que ya ve el nuevo precio.
 */

import { consultar, ejecutarTransaccion } from '../config/baseDatos.js';
import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloPuja from '../modelos/puja.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirNumeroPositivo, leerIdPositivo } from '../middlewares/validar.middleware.js';
import { aFechaIso } from '../utilidades/fecha.js';

// GET /api/pujas -> Lista ofertas filtrando opcionalmente por ?subastaId=... o ?postorId=...
export const listarPujas = atraparErrores(async (req, res) => {
  const { subastaId, postorId } = req.query;

  const idSubasta = subastaId ? leerIdPositivo(subastaId) : undefined;
  if (subastaId && !idSubasta) throw new ErrorApi(400, 'subastaId debe ser un número positivo.');

  const idPostor = postorId ? leerIdPositivo(postorId) : undefined;
  if (postorId && !idPostor) throw new ErrorApi(400, 'postorId debe ser un número positivo.');

  const pujas = await modeloPuja.listarTodas({ subastaId: idSubasta, postorId: idPostor });
  res.status(200).json(pujas);
});

// GET /api/pujas/:id -> Devuelve una puja puntual por su ID
export const obtenerPuja = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const puja = await modeloPuja.buscarPorId(id);
  if (!puja) throw new ErrorApi(404, 'Puja no encontrada.');
  res.status(200).json(puja);
});

// POST /api/pujas -> Registra una oferta nueva validando las 4 reglas principales (RN01 a RN04)
export const crearPuja = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['subastaId', 'monto']);

  const subastaId = leerIdPositivo(req.body.subastaId);
  if (!subastaId) throw new ErrorApi(400, 'subastaId debe ser un número positivo.');

  const monto = exigirNumeroPositivo(req.body.monto, 'monto');

  // RN04: El checkbox de compromiso vinculante de compra debe venir en true
  if (req.body.compromisoAceptado !== true) {
    throw new ErrorApi(400, 'RN04: Debes aceptar el compromiso vinculante de compra.');
  }

  const nota = req.body.nota ? String(req.body.nota).trim() : 'Compromiso de pago y retiro acordado.';
  await modeloSubasta.cerrarSubastasVencidas();

  const pujaCreada = await ejecutarTransaccion(async (conexion) => {
    // Bloquea la subasta hasta terminar toda la operación
    const subasta = await modeloSubasta.buscarParaBloquear(conexion, subastaId);
    if (!subasta) throw new ErrorApi(404, 'La subasta no existe.');

    // RN02: Prohibición de auto-puja (el dueño del lote no puede inflar su propio precio)
    if (Number(subasta.vendedor_id) === Number(req.usuario.id)) {
      throw new ErrorApi(403, 'RN02: No puedes pujar en tu propia subasta.');
    }

    // RN03: Solo se puede ofertar si la subasta está activa y no expiró su reloj
    const fechaFin = new Date(aFechaIso(subasta.fecha_fin)).getTime();
    if (subasta.estado !== 'activa' || fechaFin <= Date.now()) {
      throw new ErrorApi(409, 'RN03: La subasta ya finalizó o no está activa.');
    }

    // RN01: El monto debe ser igual o superior a precio_actual + incremento_minimo
    const minimo = Number(subasta.precio_actual) + Number(subasta.incremento_minimo);
    if (monto < minimo) {
      throw new ErrorApi(400, `RN01: La oferta mínima es $${minimo.toLocaleString('es-AR')}.`);
    }

    // Guardamos quién iba ganando antes para enviarle la notificación de oferta superada
    const liderAnterior = await modeloPuja.buscarOfertaLider(conexion, subastaId);

    const nuevaPuja = await modeloPuja.crear(conexion, {
      subastaId,
      postorId: req.usuario.id,
      monto,
      nota,
    });

    // Actualizamos el precio actual de la subasta al nuevo monto ganador
    await consultar('UPDATE subastas SET precio_actual = ? WHERE id = ?', [monto, subastaId], conexion);

    // Si había otro postor liderando antes, le dejamos un aviso en su bandeja de notificaciones
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

// PUT /api/pujas/:id -> El postor solo puede editar su nota aclaratoria (RN04: el monto es irrevocable)
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

// DELETE /api/pujas/:id -> Solo un administrador puede anular una puja y recalcular el precio del lote
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
