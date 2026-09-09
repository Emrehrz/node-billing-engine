import { query } from '../db';

export interface Plan {
  id: string;
  name: string;
  price: string; // NUMERIC is returned as string by pg
  currency: string;
  billing_interval: string;
  created_at: Date;
}

export const PlanRepository = {
  async getPlanById(id: string): Promise<Plan | null> {
    const result = await query('SELECT * FROM plans WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  },
};
