-- Insert some dummy plans for development
INSERT INTO plans (name, price, currency, billing_interval)
VALUES 
  ('Basic Plan', 9.99, 'USD', 'monthly'),
  ('Pro Plan', 29.99, 'USD', 'monthly'),
  ('Annual Pro Plan', 299.90, 'USD', 'yearly')
ON CONFLICT DO NOTHING;
