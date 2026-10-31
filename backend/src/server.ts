import type { Server } from 'http';
import app from './app';
import { env } from './config/env';
import { testConnection } from './config/database';

// Nothing awaited deeper in the stack should crash the process silently.
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[process] uncaught exception:', error);
});

async function start() {
  try {
    await testConnection();
    console.log(
      `[db] connected to PostgreSQL at ${env.db.host}:${env.db.port}/${env.db.name} (schema: ${env.db.schema})`,
    );
  } catch (error) {
    console.error('[db] WARNING: could not connect to PostgreSQL. Check your .env settings.');
    console.error((error as Error).message);
  }

  const server: Server = app.listen(env.port, () => {
    console.log(`[server] BIKA WUNGUKE API listening on http://localhost:${env.port}`);
    console.log(`[server] Health check: http://localhost:${env.port}/api/health`);
  });

  server.on('error', (error) => {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EADDRINUSE') {
      console.error(`[server] Port ${env.port} is already in use. Change PORT in .env.`);
    } else if (code === 'EACCES') {
      console.error(`[server] Not allowed to bind port ${env.port}. Change PORT in .env.`);
    } else {
      console.error('[server] failed to start:', error);
    }
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received, shutting down...`);
    server.close(() => {
      console.log('[server] closed');
      process.exit(0);
    });
    // Force-exit if open connections keep the server from closing.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
