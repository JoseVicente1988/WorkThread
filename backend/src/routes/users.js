import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

router.get('/me', authRequired, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, email: true, bio: true, skills: true, createdAt: true }
  });
  res.json(me);
});

const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  skills: z.string().max(200).optional()
});

router.put('/me', authRequired, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { bio = '', skills = '' } = parsed.data;
  await prisma.user.update({ where: { id: req.user.id }, data: { bio, skills } });
  res.json({ ok: true });
});

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  const users = await prisma.user.findMany({
    where: { OR: [
      { username: { contains: q, mode: 'insensitive' } },
      { skills: { contains: q, mode: 'insensitive' } },
      { bio: { contains: q, mode: 'insensitive' } }
    ]},
    select: { id: true, username: true, skills: true, bio: true }
  });
  res.json(users);
});

export default router;
