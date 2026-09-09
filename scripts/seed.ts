import fs from 'fs';
import path from 'path';
import { query } from '../src/db';

async function runSeed() {
  try {
    const sqlPath = path.join(__dirname, 'seed_plans.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('Seeding plans...');
    await query(sql);
    console.log('✅ Seed successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

runSeed();
