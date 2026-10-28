import es, { INDEX } from '../../config/elastic.js';
import prisma from '../../config/db.js';

export async function ensureIndex() {
  const exists = await es.indices.exists({ index: INDEX });
  if (exists) return;

  await es.indices.create({
    index: INDEX,
    mappings: {
      properties: {
        title: { type: 'text' },
        description: { type: 'text' },
        categoryId: { type: 'integer' },
        categoryName: { type: 'keyword' },
        vendorId: { type: 'integer' },
        storeName: { type: 'keyword' },
        pricePaise: { type: 'integer' },
        stock: { type: 'integer' },
        isActive: { type: 'boolean' },
        imageUrl: { type: 'keyword', index: false },
        createdAt: { type: 'date' },
      },
    },
  });
  console.log('Created Elasticsearch index:', INDEX);
}

function toDoc(p) {
  return {
    title: p.title,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    vendorId: p.vendorId,
    storeName: p.vendor.storeName,
    pricePaise: p.pricePaise,
    stock: p.stock,
    isActive: p.isActive,
    imageUrl: p.images[0]?.url ?? null,
    createdAt: p.createdAt,
  };
}

// Copies one product from Postgres into Elasticsearch (or removes it).
// A search failure must never break the vendor's request, so errors are only logged.
export async function syncProduct(id) {
  try {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        vendor: { select: { storeName: true } },
      },
    });

    if (!p || !p.isActive) {
      await es.delete({ index: INDEX, id: String(id) }, { ignore: [404] });
      return;
    }
    await es.index({ index: INDEX, id: String(id), document: toDoc(p), refresh: true });
  } catch (err) {
    console.error('search sync failed for product', id, err.message);
  }
}

export async function reindexAll() {
  const products = await prisma.product.findMany({ select: { id: true } });
  for (const { id } of products) await syncProduct(id);
  return products.length;
}

const SORTS = {
  price_asc: [{ pricePaise: 'asc' }],
  price_desc: [{ pricePaise: 'desc' }],
  newest: [{ createdAt: 'desc' }],
};

export async function search({ q, categoryId, minPrice, maxPrice, sort, page, limit }) {
  const must = q
    ? [{ multi_match: { query: q, fields: ['title^3', 'description'], fuzziness: 'AUTO' } }]
    : [{ match_all: {} }];

  const filter = [{ term: { isActive: true } }];
  if (categoryId) filter.push({ term: { categoryId } });

  // the API takes rupees, the index stores paise
  if (minPrice !== undefined || maxPrice !== undefined) {
    const range = {};
    if (minPrice !== undefined) range.gte = minPrice * 100;
    if (maxPrice !== undefined) range.lte = maxPrice * 100;
    filter.push({ range: { pricePaise: range } });
  }

  // with a text query, default to best match; without one, newest first
  const sortRule = SORTS[sort] || (q ? undefined : SORTS.newest);

  const result = await es.search({
    index: INDEX,
    from: (page - 1) * limit,
    size: limit,
    query: { bool: { must, filter } },
    ...(sortRule && { sort: sortRule }),
  });

  const total = result.hits.total.value;
  return {
    total,
    page,
    pages: Math.ceil(total / limit),
    items: result.hits.hits.map((h) => ({ id: Number(h._id), ...h._source })),
  };
}