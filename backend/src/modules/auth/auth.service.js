import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';
import AppError from '../../utils/AppError.js';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  return { user: publicUser(user), token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // same message for both cases so attackers can't tell which emails exist
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new AppError('Wrong email or password', 401);

  return { user: publicUser(user), token: signToken(user) };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendor: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return publicUser(user);
}