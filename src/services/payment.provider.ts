import crypto from 'crypto';
import { logger } from '../logger';

export interface PaymentProvider {
  processPayment(amount: string, currency: string): Promise<{ success: boolean; reference?: string }>;
}

export const FakePaymentProvider: PaymentProvider = {
  async processPayment(amount: string, currency: string) {
    logger.info({ amount, currency }, 'Processing payment via FakePaymentProvider');
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate occasional failure for robustness testing, 
    // but keep it mostly successful.
    const isSuccess = Math.random() > 0.1;

    if (!isSuccess) {
      logger.warn('FakePaymentProvider simulated a failed payment');
      return { success: false };
    }

    const reference = `fake_txn_${crypto.randomBytes(8).toString('hex')}`;
    return { success: true, reference };
  },
};
