import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Phase 3/4 - Implement business logic, db operations
  res.status(201).json({
    id: 'placeholder-uuid',
    email: req.body.email,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Phase 3/4 - Implement login logic and JWT generation
  res.status(200).json({
    accessToken: 'placeholder-jwt',
  });
});
