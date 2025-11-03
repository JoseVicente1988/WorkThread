import { Router } from 'express';
import { PrismaClient, AppStatus } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const applySchema = z.object({
  jobId: z.string().min(1),
  message: z.string().max(1000).optional()
});

router.post('/', authRequired, async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { jobId, message = '' } = parsed.data;
  try {
    const app = await prisma.application.create({ data: { jobId, userId: req.user.id, message } });
    res.json(app);
  } catch (e) {
    if (String(e).includes('Unique constraint')) return res.status(409).json({ error: 'Already applied' });
    res.status(500).json({ error: 'Failed to apply' });
  }
});

router.get('/mine', authRequired, async (req, res) => {
  const list = await prisma.application.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { job: true }
  });
  res.json(list);
});

router.patch('/:appId/status', authRequired, async (req, res) => {
  const status = String(req.body.status || '');
  if (!Object.keys(AppStatus).includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const app = await prisma.application.findUnique({ where: { id: req.params.appId }, include: { job: true } });
  if (!app) return res.status(404).json({ error: 'Not found' });
  if (app.job.postedById !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.application.update({ where: { id: app.id }, data: { status } });
  res.json(updated);
});

export default router;
