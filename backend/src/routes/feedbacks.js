import { Router } from 'express';
import { PrismaClient, FeedbackType } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const createSchema = z.object({
  postId: z.string().min(1),
  type: z.nativeEnum(FeedbackType),
  content: z.string().max(500).optional()
});

router.post('/', authRequired, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { postId, type, content = '' } = parsed.data;
  const fb = await prisma.feedback.create({ data: { postId, type, content, authorId: req.user.id } });
  res.json(fb);
});

router.get('/for/:postId', async (req, res) => {
  const list = await prisma.feedback.findMany({
    where: { postId: req.params.postId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(list);
});

export default router;
