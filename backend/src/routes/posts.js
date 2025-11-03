import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const postSchema = z.object({
  content: z.string().min(1).max(2000),
  tags: z.string().max(200).optional()
});

router.post('/', authRequired, async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { content, tags = '' } = parsed.data;
  const post = await prisma.post.create({ data: { content, tags, authorId: req.user.id } });
  res.json(post);
});

router.get('/feed', authRequired, async (_req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      author: { select: { id: true, username: true } },
      _count: { select: { comments: true } },
      feedbacks: true
    }
  });

  const result = posts.map(p => {
    const counts = { LIKE:0, INSIGHT:0, QUESTION:0, HIRE_ME:0, REFER:0 };
    for (const f of p.feedbacks) counts[f.type] = (counts[f.type] || 0) + 1;
    return {
      id: p.id,
      author: p.author,
      content: p.content,
      tags: p.tags,
      createdAt: p.createdAt,
      feedbackCounts: counts,
      commentsCount: p._count.comments
    };
  });

  res.json(result);
});

router.get('/by/:userId', async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { authorId: req.params.userId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(posts);
});

export default router;
