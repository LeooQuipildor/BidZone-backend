import app from './app.js';
import { env, validateEnv } from './config/env.js';
import { formatDatabaseError, pool, testDatabaseConnection } from './config/db.js';

async function startServer() {
  try {
    validateEnv();
    await testDatabaseConnection();
    console.log(`[MySQL] Conectado exitosamente a la base de datos "${env.db.database}".`);
  } catch (err) {
    console.error('[Startup Error] No se pudo inicializar el backend:', formatDatabaseError(err));
    await pool.end().catch(() => {});
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[BidZone API] Servidor Express escuchando en http://localhost:${env.port}/api`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[Shutdown] Señal ${signal} recibida. Cerrando servidor y pool MySQL...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();

