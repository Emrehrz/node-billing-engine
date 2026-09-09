import { beforeAll, beforeEach, afterAll } from 'vitest';
import { query, pool } from '../src/db';

beforeAll(async () => {
  // Test connection to ensure DB is available before running tests
  try {
    await query('SELECT 1');
  } catch (error) {
    console.error('Failed to connect to the test database. Ensure PostgreSQL is running and DATABASE_URL is correct.');
    process.exit(1);
  }
});

beforeEach(async () => {
  // Clear all data before each test to ensure a clean state
  await query('TRUNCATE users, subscriptions, payments CASCADE');
  
  // Reseed the plans table since it's static reference data
  await query(`
    INSERT INTO plans (id, name, price, currency, billing_interval)
    VALUES 
      ('00d6a617-d60e-4353-baaa-f95d2ef0852c', 'Basic Plan', 9.99, 'USD', 'month'),
      ('1a590cce-f6b9-4786-8f3e-821557ad42ea', 'Pro Plan', 29.99, 'USD', 'month')
    ON CONFLICT (id) DO NOTHING;
  `);
});

afterAll(async () => {
  // Close the database pool so Vitest can exit cleanly
  await pool.end();
});
