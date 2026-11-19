/**
 * ============================================================================
 * ARCHIVO: src/controladores/resena.controller.js
 * ROL: Controlador de calificaciones mutuas (1 a 5 estrellas) y reputación (RN07).
 * ============================================================================
 *
 * REGLA DE NEGOCIO RN07:
 * 1. Solo se puede calificar cuando la subasta ya está 'finalizada' y tiene ganador.
 * 2. El ganador califica automáticamente al vendedor ('comprador_a_vendedor') y el
 *    vendedor califica automáticamente al ganador ('vendedor_a_comprador').
 * 3. Cada parte puede emitir máximo UNA reseña por subasta.
 * 4. Al crear, editar o borrar una reseña, se recalcula el promedio de reputación
 *    del usuario calificado dentro de la misma transacción SQL.
 */

import { ejecutarTransaccion } from '../config/baseDatos.js';
import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloResena from '../modelos/resena.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirValorPermitido, leerIdPositivo } from '../middlewares/validar.middleware.js';

const CONTEXTOS_ROL = ['comprador_a_vendedor', 'vendedor_a_comprador'];

// Función auxiliar que exige un puntaje entero exacto entre 1 y 5 estrellas
function validarEstrellas(valor) {
  const puntaje = Number(valor);
  if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
    throw new ErrorApi(400, 'La calificación debe ser un número entero entre 1 y 5.');
  }
  return puntaje;
}

// GET /api/resenas -> Lista calificaciones con filtros opcionales (?subastaId, ?calificadoId, ?autorId)
export const listarResenas = atraparErrores(async (req, res) => {
  const { subastaId, calificadoId, autorId } = req.query;

  const idSubasta = subastaId ? leerIdPositivo(subastaId) : undefined;
  if (subastaId && !idSubasta) throw new ErrorApi(400, 'subastaId debe ser un número positivo.');

  const idCalificado = calificadoId ? leerIdPositivo(calificadoId) : undefined;
  if (calificadoId && !idCalificado) throw new ErrorApi(400, 'calificadoId debe ser un número positivo.');

  const idAutor = autorId ? leerIdPositivo(autorId) : undefined;
  if (autorId && !idAutor) throw new ErrorApi(400, 'autorId debe ser un número positivo.');

  const resenas = await modeloResena.listarTodas({
    subastaId: idSubasta,
    calificadoId: idCalificado,
    autorId: idAutor,
  });
  res.status(200).json(resenas);
});

// GET /api/resenas/:id -> Devuelve una calificación individual
export const obtenerResena = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const resena = await modeloResena.buscarPorId(id);
  if (!resena) throw new ErrorApi(404, 'Calificación no encontrada.');
  res.status(200).json(resena);
});

// POST /api/resenas -> Crea la calificación post-cierre y actualiza el promedio en la tabla usuarios
export const crearResena = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['subastaId', 'puntaje']);

  const subastaId = leerIdPositivo(req.body.subastaId);
  if (!subastaId) throw new ErrorApi(400, 'subastaId debe ser un número positivo.');

  const puntaje = validarEstrellas(req.body.puntaje);
  const comentario = req.body.comentario ? String(req.body.comentario).trim() : '';

  const creada = await ejecutarTransaccion(async (conexion) => {
    const subasta = await modeloSubasta.buscarPorId(subastaId, conexion);
    if (!subasta) throw new ErrorApi(404, 'Subasta no encontrada.');

    // RN07: Solo se admite calificación si la subasta finalizó con ganador
    if (subasta.estado !== 'finalizada') {
      throw new ErrorApi(409, 'RN07: Solo se pueden calificar subastas finalizadas.');
    }
    if (!subasta.ganadorId) {
      throw new ErrorApi(409, 'RN07: Esta subasta finalizó sin ganador.');
    }

    // Determinamos automáticamente quién es la contraparte calificada según quién está logueado
    const esAdmin = req.usuario.rol === 'admin';
    const esGanador = Number(req.usuario.id) === Number(subasta.ganadorId);
    const esVendedor = Number(req.usuario.id) === Number(subasta.vendedorId);

    let calificadoId;
    let contextoRol;

    if (esGanador) {
      calificadoId = subasta.vendedorId;
      contextoRol = 'comprador_a_vendedor';
    } else if (esVendedor) {
      calificadoId = subasta.ganadorId;
      contextoRol = 'vendedor_a_comprador';
    } else if (esAdmin) {
      calificadoId = leerIdPositivo(req.body.calificadoId);
      if (!calificadoId || calificadoId === Number(req.usuario.id)) {
        throw new ErrorApi(400, 'Debes indicar un calificadoId válido.');
      }
      contextoRol = req.body.contextoRol
        ? exigirValorPermitido(req.body.contextoRol, CONTEXTOS_ROL, 'contextoRol')
        : 'comprador_a_vendedor';
    } else {
      throw new ErrorApi(403, 'RN07: Solo el vendedor o el ganador pueden calificar esta operación.');
    }

    // RN07: Impedimos que la misma persona califique dos veces el mismo lote
    if (await modeloResena.yaCalifico(conexion, subastaId, req.usuario.id)) {
      throw new ErrorApi(409, 'RN07: Ya calificaste esta subasta.');
    }

    const resena = await modeloResena.crear(conexion, {
      subastaId,
      autorId: req.usuario.id,
      calificadoId,
      puntaje,
      comentario,
      contextoRol,
    });

    // Actualizamos el promedio de reputación del usuario calificado
    await modeloResena.recalcularReputacion(conexion, calificadoId);
    return resena;
  });

  res.status(201).json(creada);
});

// PUT /api/resenas/:id -> Permite al autor (o admin) editar puntaje/comentario y recalcula reputación
export const actualizarResena = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);

  const actualizada = await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloResena.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Calificación no encontrada.');

    const esAdmin = req.usuario.rol === 'admin';
    const esAutor = Number(actual.autorId) === Number(req.usuario.id);
    if (!esAdmin && !esAutor) throw new ErrorApi(403, 'Solo el autor o un administrador puede editarla.');

    const cambios = {};
    if (req.body.puntaje !== undefined) cambios.puntaje = validarEstrellas(req.body.puntaje);
    if (req.body.comentario !== undefined) cambios.comentario = String(req.body.comentario).trim();
    if (esAdmin && req.body.contextoRol !== undefined) {
      cambios.contextoRol = exigirValorPermitido(req.body.contextoRol, CONTEXTOS_ROL, 'contextoRol');
    }

    const guardada = await modeloResena.actualizar(conexion, id, cambios);
    await modeloResena.recalcularReputacion(conexion, actual.calificadoId);
    return guardada;
  });

  res.status(200).json(actualizada);
});

// DELETE /api/resenas/:id -> Borra la calificación y recalcula reputación del usuario afectado
export const eliminarResena = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);

  await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloResena.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Calificación no encontrada.');

    const esAdmin = req.usuario.rol === 'admin';
    const esAutor = Number(actual.autorId) === Number(req.usuario.id);
    if (!esAdmin && !esAutor) throw new ErrorApi(403, 'Solo el autor o un administrador puede eliminarla.');

    await modeloResena.eliminar(conexion, id);
    await modeloResena.recalcularReputacion(conexion, actual.calificadoId);
  });

  res.status(200).json({ mensaje: 'Calificación eliminada y reputación recalculada.', id });
});
