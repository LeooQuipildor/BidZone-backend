// Error controlado de nuestra API (con código HTTP y mensaje claro)
export class ErrorApi extends Error {
  constructor(codigoHttp, mensaje) {
    super(mensaje);
    this.codigoHttp = codigoHttp;
  }
}

// Envuelve funciones async para enviar cualquier error al manejador global
export function atraparErrores(funcionAsync) {
  return (req, res, next) => {
    Promise.resolve(funcionAsync(req, res, next)).catch(next);
  };
}

// Se ejecuta cuando nadie atendió la ruta solicitada (Error 404)
export function rutaNoEncontrada(req, res) {
  res.status(404).json({
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

// Manejador central de errores: convierte cada error en una respuesta JSON clara
export function manejarErrores(error, _req, res, _next) {
  if (error instanceof ErrorApi) {
    return res.status(error.codigoHttp).json({ mensaje: error.message });
  }

  if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El JSON enviado no es válido.' });
  }

  if (error?.name === 'TokenExpiredError') {
    return res.status(401).json({ mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.' });
  }

  if (error?.name === 'JsonWebTokenError') {
    return res.status(401).json({ mensaje: 'Token de autenticación inválido.' });
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ mensaje: 'Ya existe un registro con ese dato único.' });
  }

  if (error?.code === 'ER_ROW_IS_REFERENCED' || error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      mensaje: 'No se puede eliminar porque tiene operaciones asociadas.',
    });
  }

  if (error?.code === 'ECONNREFUSED' || error?.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ mensaje: 'No hay conexión con la base de datos MySQL.' });
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error del servidor]', error);
  }
  return res.status(500).json({ mensaje: 'Error interno del servidor.' });
}
