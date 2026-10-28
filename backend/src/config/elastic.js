import { Client } from '@elastic/elasticsearch';

const es = new Client({
  node: process.env.ELASTIC_URL || 'http://localhost:9200',
});

export const INDEX = 'products';
export default es;