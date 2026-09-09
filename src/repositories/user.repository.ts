import { query } from '../db';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export const UserRepository = {
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  },

  async createUser(email: string, passwordHash: string): Promise<User> {
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    return result.rows[0];
  },
};
