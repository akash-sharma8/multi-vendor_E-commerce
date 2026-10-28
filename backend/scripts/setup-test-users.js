import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/db.js';

const makeToken = (u) =>
  jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

async function ensureUser(name, email, role) {
  const passwordHash = await bcrypt.hash('Test@1234', 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
}

const vendorUser = await ensureUser('Ravi', 'ravi@test.com', 'VENDOR');
const customer = await ensureUser('Amit', 'amit@test.com', 'CUSTOMER');

const vendor = await prisma.vendorProfile.upsert({
  where: { userId: vendorUser.id },
  update: { status: 'APPROVED' },
  create: { userId: vendorUser.id, storeName: 'Ravi Gadgets', status: 'APPROVED' },
});

const hasProduct = await prisma.product.count({
  where: { vendorId: vendor.id, isActive: true, stock: { gt: 0 } },
});
if (!hasProduct) {
  await prisma.product.create({
    data: {
      vendorId: vendor.id,
      categoryId: 1,
      title: 'Wireless Mouse',
      description: 'Ergonomic 2.4GHz mouse',
      pricePaise: 79900,
      stock: 50,
    },
  });
  console.log('Created a test product (run: npm run reindex)');
}

console.log('\nVENDOR TOKEN:\n' + makeToken(vendorUser));
console.log('\nCUSTOMER TOKEN:\n' + makeToken(customer));
console.log('\nBoth accounts use password: Test@1234');

await prisma.$disconnect();