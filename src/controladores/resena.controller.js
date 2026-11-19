import { ejecutarTransaccion } from '../config/baseDatos.js';
import * as modeloSubasta from '../modelos/subasta.model.js';
import * as modeloResena from '../modelos/resena.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirValorPermitido, leerIdPositivo } from '../middlewares/validar.middleware.js';

const CONTEXTOS_ROL = ['comprador_a_vendedor', 'vendedor_a_comprador'];

function validarEstrellas(valor) {
  const puntaje = Number(valor);
  if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
    throw new ErrorApi(400, 'La calificación debe ser un número entero entre 1 y 5.');
  }
  return puntaje;
}

// GET /api/resenas - Lista calificaciones con filtros opcionales
export const listarResenas = atraparErrores(async (req, res) => {
  const { auctionId, targetUserId, reviewerId } = req.query;

  const idSubasta = auctionId ? leerIdPositivo(auctionId) : undefined;
  if (auctionId && !idSubasta) throw new ErrorApi(400, 'auctionId debe ser un número positivo.');

  const idCalificado = targetUserId ? leerIdPositivo(targetUserId) : undefined;
  if (targetUserId && !idCalificado) throw new ErrorApi(400, 'targetUserId debe ser un número positivo.');

  const idAutor = reviewerId ? leerIdPositivo(reviewerId) : undefined;
  if (reviewerId && !idAutor) throw new ErrorApi(400, 'reviewerId debe ser un número positivo.');

  const resenas = await modeloResena.listarTodas({
    auctionId: idSubasta,
    targetUserId: idCalificado,
    reviewerId: idAutor,
  });
  res.status(200).json(resenas);
});

// GET /api/resenas/:id - Devuelve una calificación por ID
export const obtenerResena = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const resena = await modeloResena.buscarPorId(id);
  if (!resena) throw new ErrorApi(404, 'Calificación no encontrada.');
  res.status(200).json(resena);
});

// POST /api/resenas - Registra calificación única post-cierre y recalcula reputación (RN07)
export const crearResena = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['auctionId', 'rating']);

  const idSubasta = leerIdPositivo(req.body.auctionId);
  if (!idSubasta) throw new ErrorApi(400, 'auctionId debe ser un número positivo.');

  const puntaje = validarEstrellas(req.body.rating);
  const comentario = req.body.comment ? String(req.body.comment).trim() : '';

  const creada = await ejecutarTransaccion(async (conexion) => {
    const subasta = await modeloSubasta.buscarPorId(idSubasta, conexion);
    if (!subasta) throw new ErrorApi(404, 'Subasta no encontrada.');

    // RN07: Solo se califica cuando la subasta finalizó con ganador
    if (subasta.status !== 'finalizada') {
      throw new ErrorApi(409, 'RN07: Solo se pueden calificar subastas finalizadas.');
    }
    if (!subasta.winnerId) {
      throw new ErrorApi(409, 'RN07: Esta subasta finalizó sin ganador.');
    }

    const esAdmin = req.usuario.role === 'admin';
    const esGanador = Number(req.usuario.id) === Number(subasta.winnerId);
    const esVendedor = Number(req.usuario.id) === Number(subasta.sellerId);

    let idCalificado;
    let contextoRol;

    if (esGanador) {
      idCalificado = subasta.sellerId;
      contextoRol = 'comprador_a_vendedor';
    } else if (esVendedor) {
      idCalificado = subasta.winnerId;
      contextoRol = 'vendedor_a_comprador';
    } else if (esAdmin) {
      idCalificado = leerIdPositivo(req.body.targetUserId);
      if (!idCalificado || idCalificado === Number(req.usuario.id)) {
        throw new ErrorApi(400, 'Debes indicar un targetUserId válido.');
      }
      contextoRol = req.body.roleContext
        ? exigirValorPermitido(req.body.roleContext, CONTEXTOS_ROL, 'roleContext')
        : 'comprador_a_vendedor';
    } else {
      throw new ErrorApi(403, 'RN07: Solo el vendedor o el ganador pueden calificar esta operación.');
    }

    // RN07: Una sola reseña por persona y subasta
    if (await modeloResena.yaCalifico(conexion, idSubasta, req.usuario.id)) {
      throw new ErrorApi(409, 'RN07: Ya calificaste esta subasta.');
    }

    const resena = await modeloResena.crear(conexion, {
      auctionId: idSubasta,
      reviewerId: req.usuario.id,
      targetUserId: idCalificado,
      rating: puntaje,
      comment: comentario,
      roleContext: contextoRol,
    });

    await modeloResena.recalcularReputacion(conexion, idCalificado);
    return resena;
  });

  res.status(201).json(creada);
});

// PUT /api/resenas/:id - Edita puntaje o comentario y recalcula reputación
export const actualizarResena = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);

  const actualizada = await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloResena.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Calificación no encontrada.');

    const esAdmin = req.usuario.role === 'admin';
    const esAutor = Number(actual.reviewerId) === Number(req.usuario.id);
    if (!esAdmin && !esAutor) throw new ErrorApi(403, 'Solo el autor o un administrador puede editarla.');

    const cambios = {};
    if (req.body.rating !== undefined) cambios.rating = validarEstrellas(req.body.rating);
    if (req.body.comment !== undefined) cambios.comment = String(req.body.comment).trim();
    if (esAdmin && req.body.roleContext !== undefined) {
      cambios.roleContext = exigirValorPermitido(req.body.roleContext, CONTEXTOS_ROL, 'roleContext');
    }

    const guardada = await modeloResena.actualizar(conexion, id, cambios);
    await modeloResena.recalcularReputacion(conexion, actual.targetUserId);
    return guardada;
  });

  res.status(200).json(actualizada);
});

// DELETE /api/resenas/:id - Elimina una calificación y recalcula reputación
export const eliminarResena = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);

  await ejecutarTransaccion(async (conexion) => {
    const actual = await modeloResena.buscarPorId(id, conexion);
    if (!actual) throw new ErrorApi(404, 'Calificación no encontrada.');

    const esAdmin = req.usuario.role === 'admin';
    const esAutor = Number(actual.reviewerId) === Number(req.usuario.id);
    if (!esAdmin && !esAutor) throw new ErrorApi(403, 'Solo el autor o un administrador puede eliminarla.');

    await modeloResena.eliminar(conexion, id);
    await modeloResena.recalcularReputacion(conexion, actual.targetUserId);
  });

  res.status(200).json({ message: 'Calificación eliminada y reputación recalculada.', id });
});
