import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

/**
 * The Express application itself (no listener) - imported by
 * src/server.ts in production and by supertest in the test suite.
 */
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Vercel rewrites can invoke the function with the path relative to /api,
// while local development and some Vercel configurations retain the prefix.
// Normalize both forms so /api/auth/* reaches the same Express router.
app.use((req, _res, next) => {
  if (req.path !== '/api' && !req.path.startsWith('/api/')) {
    req.url = `/api${req.url}`;
  }
  next();
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
