import 'dotenv/config';

/**
 * Runs before any test module is imported.
 * Points the application at the dedicated test database so the development
 * database is never touched by the test suite.
 * (dotenv does not override variables that are already set, and these
 * assignments run before the test file imports src/app.)
 */
process.env.DB_NAME = 'bika_wunguke_test';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_only_secret_value';
