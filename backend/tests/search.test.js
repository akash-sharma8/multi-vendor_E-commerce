import request from 'supertest';
import app from '../src/app.js';
import { auth, cleanup, makeVendor, tag } from './helpers.js';

let vendor, id;

beforeAll(async () => { vendor = await makeVendor('vendor'); });
afterAll(cleanup);

const search = (query) => request(app).get('/api/search').query({ q: tag, ...query });
const ids = (res) => res.body.items.map((i) => i.id);

describe('search stays in sync with the database', () => {
  it('indexes a product when the vendor creates it', async () => {
    const create = await request(app).post('/api/products').set(auth(vendor.token)).send({
      title: `${tag} Wireless Mouse`,
      description: 'Ergonomic 2.4GHz mouse',
      pricePaise: 123400,
      stock: 5,
    });
    expect(create.status).toBe(201);
    id = create.body.id;
    expect(ids(await search())).toContain(id);
  });

  it('filters by price range in rupees', async () => {
    expect(ids(await search({ minPrice: 1000, maxPrice: 1500 }))).toContain(id);
    expect(ids(await search({ maxPrice: 1000 }))).not.toContain(id);
  });

  it('reflects a price update', async () => {
    await request(app).put(`/api/products/${id}`).set(auth(vendor.token)).send({ pricePaise: 50000 });
    expect(ids(await search({ minPrice: 1000 }))).not.toContain(id);
    expect(ids(await search({ maxPrice: 1000 }))).toContain(id);
  });

  it('rejects an invalid sort value', async () => {
    expect((await search({ sort: 'banana' })).status).toBe(400);
  });

  it('removes a product from search when it is deleted', async () => {
    const del = await request(app).delete(`/api/products/${id}`).set(auth(vendor.token));
    expect(del.status).toBe(204);
    expect(ids(await search())).not.toContain(id);
  });
});