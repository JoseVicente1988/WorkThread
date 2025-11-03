import 'dotenv/config';
import { PrismaClient, FeedbackType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const pwd = await bcrypt.hash('password123', 10);
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { username: 'alice', email: 'alice@example.com', passwordHash: pwd, bio: 'Fullstack dev', skills: 'node,react,postgres' }
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { username: 'bob', email: 'bob@example.com', passwordHash: pwd, bio: 'Backend enjoyer', skills: 'go,grpc,k8s' }
  });
  const post1 = await prisma.post.create({ data: { authorId: alice.id, content: '¿Consejos para entrevistas backend?', tags: 'entrevista,backend' } });
  await prisma.feedback.create({ data: { postId: post1.id, authorId: bob.id, type: FeedbackType.INSIGHT, content: 'Practica sistemas distribuidos y bases de datos.' } });

  await prisma.job.create({
    data: {
      title: 'Senior Node.js Engineer',
      company: 'TechFlow',
      location: 'Remote',
      remote: true,
      minSalary: 80000,
      maxSalary: 120000,
      currency: 'USD',
      skills: 'node,express,postgres,aws',
      description: 'Construye APIs de alto rendimiento con Node.js/Express y Postgres en AWS.',
      postedById: alice.id
    }
  });

  await prisma.job.create({
    data: {
      title: 'DevOps Engineer',
      company: 'CloudBridge',
      location: 'Madrid',
      remote: false,
      minSalary: 50000,
      maxSalary: 70000,
      currency: 'EUR',
      skills: 'k8s,terraform,ci/cd,aws',
      description: 'Infraestructura como código, pipelines y observabilidad.',
      postedById: bob.id
    }
  });

  console.log('Done.');
}

main().finally(() => prisma.$disconnect());
