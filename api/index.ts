import app from '../backend/src/app';

/**
 * Vercel Serverless Function adapter.
 *
 * Vercel calls the default export with (req, res) just like Node's http
 * module. Express apps already implement that signature, so we export the
 * Express app directly. The `dotenv` import inside `env.ts` is called at
 * module-evaluation time, and Vercel injects process.env from the project
 * settings — so all PGHOST, JWT_SECRET etc. variables are available.
 *
 * NOTE: This file is intentionally CommonJS-compatible (no top-level await)
 * because @vercel/node compiles it with its own bundler.
 */
export default app;
