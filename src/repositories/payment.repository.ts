import { PoolClient } from 'pg';

export interface Payment {
  id: string;
  subscription_id: string;
  amount: string; // NUMERIC is string
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  provider_reference: string | null;
  created_at: Date;
}

export const PaymentRepository = {
  async createPayment(
    client: PoolClient,
    data: { subscriptionId: string; amount: string; currency: string; status: string; providerReference: string | null }
  ): Promise<Payment> {
    const result = await client.query(
      `INSERT INTO payments (subscription_id, amount, currency, status, provider_reference)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.subscriptionId, data.amount, data.currency, data.status, data.providerReference]
    );
    return result.rows[0];
  },
};
