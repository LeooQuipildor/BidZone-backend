import app from './app.js';
import { entorno, validarEntorno } from './config/entorno.js';
import { pool, probarConexionBd } from './config/baseDatos.js';

async function iniciarServidor() {
  try {
    validarEntorno();
    await probarConexionBd();
    console.log(`[MySQL] Conectado a la base de datos "${entorno.bd.nombre}".`);
  } catch (error) {
    console.error('[Error al iniciar]', error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }

  const servidor = app.listen(entorno.puerto, () => {
    console.log(`[BidZone API] Servidor listo en http://localhost:${entorno.puerto}/api`);
  });

  // Cierre ordenado cuando se detiene con Ctrl+C
  const cerrar = () => {
    servidor.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

iniciarServidor();
