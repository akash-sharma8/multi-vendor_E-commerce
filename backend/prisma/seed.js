import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  await prisma.user.upsert({
    where: { email: 'admin@market.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@market.com', passwordHash, role: 'ADMIN' },
  });

  for (const name of ['Electronics', 'Clothing', 'Books', 'Home', 'Beauty']) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('Seeded admin and categories');
}

main().finally(() => prisma.$disconnect());