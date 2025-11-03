import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = Router();

const jobSchema = z.object({
  title: z.string().min(3).max(80),
  company: z.string().min(2).max(80),
  location: z.string().max(80).optional(),
  remote: z.boolean().optional(),
  minSalary: z.number().int().min(0).optional(),
  maxSalary: z.number().int().min(0).optional(),
  currency: z.string().max(6).optional(),
  skills: z.string().max(200).optional(),
  description: z.string().min(10).max(5000)
});

router.post('/', authRequired, async (req, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const job = await prisma.job.create({
    data: {
      title: data.title,
      company: data.company,
      location: data.location || 'Remote',
      remote: data.remote ?? true,
      minSalary: data.minSalary ?? null,
      maxSalary: data.maxSalary ?? null,
      currency: data.currency || 'USD',
      skills: data.skills || '',
      description: data.description,
      postedById: req.user.id
    }
  });
  res.json(job);
});

router.post('/:jobId/save', authRequired, async (req, res) => {
  try { await prisma.savedJob.create({ data: { jobId: req.params.jobId, userId: req.user.id } }); } catch (e) {}
  res.json({ ok: true });
});

router.delete('/:jobId/save', authRequired, async (req, res) => {
  await prisma.savedJob.deleteMany({ where: { jobId: req.params.jobId, userId: req.user.id } });
  res.json({ ok: true });
});

router.get('/search', authRequired, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const where = { AND: [] };

  if (q) {
    where.AND.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { skills: { contains: q, mode: 'insensitive' } }
      ]
    });
  }

  const remote = req.query.remote;
  if (remote === 'true') where.AND.push({ remote: true });
  if (remote === 'false') where.AND.push({ remote: false });

  const location = String(req.query.location || '').trim();
  if (location) where.AND.push({ location: { contains: location, mode: 'insensitive' } });

  const min = Number(req.query.minSalary || 0);
  if (min > 0) where.AND.push({ OR: [{ minSalary: { gte: min } }, { maxSalary: { gte: min } }] });

  const skills = String(req.query.skills || '').split(',').map(s => s.trim()).filter(Boolean);

  const jobs = await prisma.job.findMany({
    where: where.AND.length ? where : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const ranked = jobs.map(j => {
    const jSkills = (j.skills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const score = skills.length ? skills.reduce((acc, s) => acc + (jSkills.includes(s.toLowerCase()) ? 1 : 0), 0) : 0;
    return { ...j, score };
  }).sort((a, b) => b.score - a.score || (b.minSalary ?? 0) - (a.minSalary ?? 0));

  res.json(ranked);
});

router.get('/:jobId', authRequired, async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

export default router;
