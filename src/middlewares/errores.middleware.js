/**
 * ============================================================================
 * ARCHIVO: src/middlewares/errores.middleware.js
 * ROL: Centro de control de errores de toda la API.
 * ============================================================================
 *
 * ¿POR QUÉ CENTRALIZAR LOS ERRORES?
 * En vez de escribir un "try { ... } catch { res.status(...).json(...) }" repetido
 * en cada una de las 30 rutas, cada controlador simplemente hace:
 *   throw new ErrorApi(404, 'Subasta no encontrada.');
 * "atraparErrores" captura ese error y se lo pasa a "manejarErrores", que responde
 * el JSON estándar { mensaje: "..." } con el código HTTP exacto.
 */

// Clase de error propia: además del mensaje, guarda el código HTTP (400, 401, 403, 404, 409)
export class ErrorApi extends Error {
  constructor(codigoHttp, mensaje) {
    super(mensaje);
    this.codigoHttp = codigoHttp;
  }
}

// Envoltorio para controladores async: si una promesa falla, envía el error a next(error)
export function atraparErrores(funcionAsync) {
  return (req, res, next) => {
    Promise.resolve(funcionAsync(req, res, next)).catch(next);
  };
}

// Middleware 404: se ejecuta en app.js si la URL pedida no coincide con ninguna ruta registrada
export function rutaNoEncontrada(req, res) {
  res.status(404).json({
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

// Middleware global de errores (Express lo reconoce porque recibe exactamente 4 parámetros)
export function manejarErrores(error, _req, res, _next) {
  // 1. Error controlado lanzado por nosotros con "throw new ErrorApi(...)"
  if (error instanceof ErrorApi) {
    return res.status(error.codigoHttp).json({ mensaje: error.message });
  }

  // 2. El cliente envió un JSON mal escrito en el body (ej: le faltó cerrar una llave)
  if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El JSON enviado no es válido.' });
  }

  // 3. Errores de JWT (sesión vencida o token alterado)
  if (error?.name === 'TokenExpiredError') {
    return res.status(401).json({ mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.' });
  }
  if (error?.name === 'JsonWebTokenError') {
    return res.status(401).json({ mensaje: 'Token de autenticación inválido.' });
  }

  // 4. Errores conocidos de MySQL (dato único duplicado o registro con hijos relacionados)
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

  // 5. Cualquier otro error inesperado -> log en consola y respuesta genérica 500
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error del servidor]', error);
  }
  return res.status(500).json({ mensaje: 'Error interno del servidor.' });
}
