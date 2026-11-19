/**
 * ============================================================================
 * ARCHIVO: src/servidor.js
 * ROL: Punto de entrada principal del backend (se ejecuta con "npm run dev").
 * ============================================================================
 *
 * ¿QUÉ HACE ESTE ARCHIVO?
 * 1. Verifica que existan las variables obligatorias en el archivo ".env".
 * 2. Comprueba que MySQL esté encendido y acepte conexiones.
 * 3. Levanta la aplicación Express (importada desde app.js) en el puerto 3000.
 * 4. Escucha señales de apagado (como Ctrl+C) para cerrar las conexiones de
 *    MySQL de forma prolija antes de terminar el proceso.
 */

import app from './app.js';
import { entorno, validarEntorno } from './config/entorno.js';
import { pool, probarConexionBd } from './config/baseDatos.js';

// Función principal asíncrona (usa async/await porque conectarse a MySQL lleva unos milisegundos)
async function iniciarServidor() {
  try {
    // Paso 1: Comprobar que JWT_SECRET, DB_USER y DB_NAME estén configurados en .env
    validarEntorno();

    // Paso 2: Enviar una consulta simple "SELECT 1" a MySQL para confirmar conexión
    await probarConexionBd();
    console.log(`[MySQL] Conectado a la base de datos "${entorno.bd.nombre}".`);
  } catch (error) {
    // Si falla .env o MySQL está apagado, mostramos el motivo y cerramos el programa (código 1 = error)
    console.error('[Error al iniciar]', error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }

  // Paso 3: Poner el servidor a escuchar peticiones HTTP en el puerto configurado (por defecto 3000)
  const servidor = app.listen(entorno.puerto, () => {
    console.log(`[BidZone API] Servidor listo en http://localhost:${entorno.puerto}/api`);
  });

  // Paso 4: Cierre ordenado (Graceful Shutdown) cuando se presiona Ctrl+C (SIGINT) o el sistema detiene el proceso (SIGTERM)
  const cerrar = () => {
    servidor.close(async () => {
      await pool.end(); // Cierra todas las conexiones abiertas con MySQL
      process.exit(0);  // Código 0 = salida limpia sin errores
    });
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

// Ejecutamos el arranque apenas Node.js lee este archivo
iniciarServidor();
