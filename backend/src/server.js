import 'dotenv/config';
import app from './app.js';
import { ensureIndex } from './modules/search/search.service.js';

const port = process.env.PORT || 5000;

try {
  await ensureIndex();
} catch (err) {
  console.error('Elasticsearch not reachable, search will not work:', err.message);
}

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});