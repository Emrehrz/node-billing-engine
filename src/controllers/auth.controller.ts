import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthService } from '../services/auth.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await AuthService.register(email, password);
  res.status(201).json(user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  res.status(200).json(result);
});
