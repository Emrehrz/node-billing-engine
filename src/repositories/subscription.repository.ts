import { PoolClient } from 'pg';
import { query } from '../db';

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  created_at: Date;
}

export const SubscriptionRepository = {
  async hasActiveOrPendingSubscription(userId: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM subscriptions WHERE user_id = $1 AND status IN ('PENDING', 'ACTIVE') LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0;
  },

  async createSubscription(
    client: PoolClient,
    data: { userId: string; planId: string; status: string }
  ): Promise<Subscription> {
    const result = await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.userId, data.planId, data.status]
    );
    return result.rows[0];
  },
};
