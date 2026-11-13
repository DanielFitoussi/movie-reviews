import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.register(req.body ?? {});
  // Send only the public fields. The password is never sent back.
  res.status(201).json({ id: user.id, username: user.username, role: user.role });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const token = await authService.login(req.body ?? {});
  res.status(200).json({ token });
};
