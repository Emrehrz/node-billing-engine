"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../src/db");
const logger_1 = require("../src/logger");
const runMigrations = async () => {
    const client = await db_1.pool.connect();
    try {
        logger_1.logger.info('Starting database migration...');
        // Begin transaction
        await client.query('BEGIN');
        // Read and execute schema
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        logger_1.logger.info('Executing schema.sql...');
        await client.query(schemaSql);
        // Read and execute seed
        const seedPath = path_1.default.join(__dirname, 'seed_plans.sql');
        const seedSql = fs_1.default.readFileSync(seedPath, 'utf8');
        logger_1.logger.info('Executing seed_plans.sql...');
        await client.query(seedSql);
        // Commit transaction
        await client.query('COMMIT');
        logger_1.logger.info('Database migration completed successfully.');
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error({ error }, 'Database migration failed');
        process.exit(1);
    }
    finally {
        client.release();
        await db_1.pool.end(); // Close the pool so the script can exit
    }
};
runMigrations();
