import 'dotenv/config';
import { ensureIndex, reindexAll } from '../src/modules/search/search.service.js';
import prisma from '../src/config/db.js';

await ensureIndex();
const count = await reindexAll();
console.log(`Reindexed ${count} products`);
await prisma.$disconnect();