import { z } from 'zod';
import * as authService from './auth.service.js';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'at least 8 characters'),
  // ADMIN is deliberately not allowed here
  role: z.enum(['CUSTOMER', 'VENDOR']).default('CUSTOMER'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function me(req, res) {
  const user = await authService.getMe(req.user.id);
  res.json(user);
}