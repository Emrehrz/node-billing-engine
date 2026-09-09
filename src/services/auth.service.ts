import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { logger } from '../logger';

export const AuthService = {
  async register(email: string, passwordPlain: string) {
    const passwordHash = await argon2.hash(passwordPlain);

    try {
      const user = await UserRepository.createUser(email, passwordHash);
      
      // Return safe user payload (exclude password_hash)
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      };
    } catch (error: any) {
      // 23505 = unique_violation
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new AppError('EMAIL_EXISTS', 409, 'A user with this email already exists.');
      }
      throw error;
    }
  },

  async login(email: string, passwordPlain: string) {
    const user = await UserRepository.getUserByEmail(email);

    if (!user) {
      // Generic 401 to prevent enumeration
      throw new AppError('UNAUTHORIZED', 401, 'Invalid email or password');
    }

    const isValid = await argon2.verify(user.password_hash, passwordPlain);

    if (!isValid) {
      throw new AppError('UNAUTHORIZED', 401, 'Invalid email or password');
    }

    // Generate JWT
    const token = jwt.sign(
      { sub: user.id },
      env.JWT_SECRET,
      { expiresIn: '2h' } // Short lived
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  },
};
