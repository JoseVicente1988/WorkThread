import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = Router();

router.post('/:userId', authRequired, async (req, res) => {
  if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
  try {
    await prisma.follow.create({ data: { followerId: req.user.id, followingId: req.params.userId } });
    res.json({ ok: true });
  } catch (e) {
    if (String(e).includes('Unique constraint')) return res.json({ ok: true });
    res.status(500).json({ error: 'Failed to follow' });
  }
});

router.delete('/:userId', authRequired, async (req, res) => {
  await prisma.follow.deleteMany({ where: { followerId: req.user.id, followingId: req.params.userId } });
  res.json({ ok: true });
});

router.get('/followers/:userId', async (req, res) => {
  const count = await prisma.follow.count({ where: { followingId: req.params.userId } });
  res.json({ count });
});

router.get('/following/:userId', async (req, res) => {
  const count = await prisma.follow.count({ where: { followerId: req.params.userId } });
  res.json({ count });
});

export default router;
