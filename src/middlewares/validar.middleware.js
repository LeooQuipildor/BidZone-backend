/**
 * ============================================================================
 * ARCHIVO: src/middlewares/validar.middleware.js
 * ROL: Funciones pequeñas y reutilizables para validar los datos que envía el cliente.
 * ============================================================================
 *
 * ¿POR QUÉ VALIDAR EN EL BACKEND SI REACT YA VALIDA FORMULARIOS?
 * Porque cualquiera puede enviar peticiones directo a la API (con Postman o curl)
 * saltándose la pantalla de React. Validar acá garantiza que nunca entren datos
 * corruptos o vacíos a MySQL.
 */

import { ErrorApi } from './errores.middleware.js';

// Convierte un texto o número en un entero mayor a 0; si no es válido devuelve null
export function leerIdPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

// Middleware de Express para rutas con ":id" (ej: GET /api/subastas/:id)
// Si alguien pide /api/subastas/hola, frena la petición con Error 400 antes de tocar MySQL
export function validarParametroId(nombre = 'id') {
  return (req, _res, next) => {
    const idValido = leerIdPositivo(req.params[nombre]);
    if (!idValido) {
      return next(new ErrorApi(400, `El parámetro "${nombre}" debe ser un número positivo.`));
    }
    req.params[nombre] = String(idValido);
    return next();
  };
}

// Comprueba mediante expresión regular que el texto tenga formato básico de correo (algo@dominio.ext)
export function esCorreoValido(correo) {
  return typeof correo === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

// Verifica que todos los campos obligatorios vengan presentes y no estén vacíos en req.body
export function exigirCampos(cuerpo, campos) {
  const datos = cuerpo || {};
  const faltantes = campos.filter(
    (campo) => datos[campo] === undefined || datos[campo] === null || String(datos[campo]).trim() === ''
  );
  if (faltantes.length > 0) {
    throw new ErrorApi(400, `Faltan campos obligatorios: ${faltantes.join(', ')}.`);
  }
}

// Verifica que un campo numérico (ej: precioBase, monto) sea un número finito mayor a cero
export function exigirNumeroPositivo(valor, nombreCampo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new ErrorApi(400, `El campo "${nombreCampo}" debe ser un número mayor a cero.`);
  }
  return numero;
}

// Verifica que un valor pertenezca a una lista fija de opciones permitidas (ej: estados o roles)
export function exigirValorPermitido(valor, permitidos, nombreCampo) {
  if (!permitidos.includes(valor)) {
    throw new ErrorApi(400, `Valor inválido para "${nombreCampo}". Permitidos: ${permitidos.join(', ')}.`);
  }
  return valor;
}
