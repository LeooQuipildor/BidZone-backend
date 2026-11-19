import { ErrorApi } from './errores.middleware.js';

// Convierte un texto o número en entero positivo; si no sirve devuelve null
export function leerIdPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

// Middleware que valida que :id en la URL sea un número entero positivo
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

// Verifica formato básico de correo electrónico
export function esCorreoValido(correo) {
  return typeof correo === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

// Verifica que los campos obligatorios vengan en el body de la petición
export function exigirCampos(cuerpo, campos) {
  const datos = cuerpo || {};
  const faltantes = campos.filter(
    (campo) => datos[campo] === undefined || datos[campo] === null || String(datos[campo]).trim() === ''
  );
  if (faltantes.length > 0) {
    throw new ErrorApi(400, `Faltan campos obligatorios: ${faltantes.join(', ')}.`);
  }
}

// Verifica que un valor sea número mayor a cero
export function exigirNumeroPositivo(valor, nombreCampo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new ErrorApi(400, `El campo "${nombreCampo}" debe ser un número mayor a cero.`);
  }
  return numero;
}

// Verifica que un valor esté dentro de la lista de opciones válidas
export function exigirValorPermitido(valor, permitidos, nombreCampo) {
  if (!permitidos.includes(valor)) {
    throw new ErrorApi(400, `Valor inválido para "${nombreCampo}". Permitidos: ${permitidos.join(', ')}.`);
  }
  return valor;
}
