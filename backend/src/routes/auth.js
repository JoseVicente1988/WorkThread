import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-z0-9_]+$/i),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { username, email, password } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { username, email, passwordHash } });
    const token = jwt.sign({}, process.env.JWT_SECRET || 'secret', { subject: user.id, expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username, email } });
  } catch (e) {
    if (String(e).includes('Unique constraint')) return res.status(409).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: 'Failed to register' });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({}, process.env.JWT_SECRET || 'secret', { subject: user.id, expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email } });
});

export default router;
