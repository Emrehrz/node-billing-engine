import fs from 'fs';
import path from 'path';
import { pool } from '../src/db';
import { logger } from '../src/logger';

const runMigrations = async () => {
  const client = await pool.connect();
  try {
    logger.info('Starting database migration...');
    
    // Begin transaction
    await client.query('BEGIN');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    logger.info('Executing schema.sql...');
    await client.query(schemaSql);

    // Read and execute seed
    const seedPath = path.join(__dirname, 'seed_plans.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    logger.info('Executing seed_plans.sql...');
    await client.query(seedSql);

    // Commit transaction
    await client.query('COMMIT');
    logger.info('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error }, 'Database migration failed');
    process.exit(1);
  } finally {
    client.release();
    await pool.end(); // Close the pool so the script can exit
  }
};

runMigrations();
