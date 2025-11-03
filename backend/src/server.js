import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth.js';
import userRouter from './routes/users.js';
import postRouter from './routes/posts.js';
import feedbackRouter from './routes/feedbacks.js';
import followRouter from './routes/follows.js';
import commentRouter from './routes/comments.js';
import jobsRouter from './routes/jobs.js';
import appsRouter from './routes/applications.js';

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60_000, max: 180 }));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);
app.use('/api/feedbacks', feedbackRouter);
app.use('/api/comments', commentRouter);
app.use('/api/follows', followRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/apps', appsRouter);

app.use('/', express.static('../frontend'));

app.listen(PORT, () => {
  console.log(`WorkThread server running on http://localhost:${PORT}`);
});
