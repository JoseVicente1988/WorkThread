import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const createSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(1000)
});

router.post('/', authRequired, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { postId, content } = parsed.data;
  const comment = await prisma.comment.create({
    data: { postId, content, authorId: req.user.id } });
  res.json(comment);
});

router.get('/for/:postId', async (req, res) => {
  const list = await prisma.comment.findMany({
    where: { postId: req.params.postId },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, username: true } } }
  });
  res.json(list);
});

export default router;
