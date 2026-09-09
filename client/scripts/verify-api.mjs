import { readFile } from 'node:fs/promises';

const baseUrl = process.env.API_URL || 'http://localhost:3000';
const checks = [];
let restaurantId;
let visitId;
let photoId;

async function request(label, path, expected, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  let body = null;
  if (response.status !== 204) {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  }
  const passed = response.status === expected;
  checks.push({ label, expected, actual: response.status, passed });
  if (!passed) throw new Error(`${label}: expected ${expected}, received ${response.status}`);
  return body;
}

const json = (body, method = 'POST') => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

try {
  await request('Health check', '/api/health', 200);
  const restaurants = await request('List restaurants', '/api/restaurants', 200);
  if (!Array.isArray(restaurants)) throw new Error('Restaurant list is not an array');
  await request('Invalid restaurant id', '/api/restaurants/abc', 404);
  await request('Negative restaurant id', '/api/restaurants/-1', 404);
  await request('Fractional restaurant id', '/api/restaurants/1.5', 404);
  await request('Missing restaurant', '/api/restaurants/99999999', 404);
  await request('Missing restaurant name', '/api/restaurants', 400, json({ rating: 4 }));
  await request('Rating above five', '/api/restaurants', 400, json({ name: 'Bad rating', rating: 6 }));
  await request('Wrong restaurant field type', '/api/restaurants', 400, json({ name: 'Bad type', cuisine: 12 }));
  await request('Malformed JSON body', '/api/restaurants', 400, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });

  const testName = `Codex verification ${Date.now()}`;
  const restaurant = await request('Create restaurant', '/api/restaurants', 201, json({ name: testName, cuisine: 'Test Kitchen', rating: 4 }));
  restaurantId = restaurant.id;
  await request('Read created restaurant', `/api/restaurants/${restaurantId}`, 200);
  await request('Duplicate restaurant', '/api/restaurants', 409, json({ name: testName }));
  await request('Update restaurant', `/api/restaurants/${restaurantId}`, 200, json({ name: `${testName} Updated`, cuisine: 'Test Kitchen', address: '1 Test Way', rating: 4.5 }, 'PUT'));
  await request('Invalid update body', `/api/restaurants/${restaurantId}`, 400, json({ name: '', rating: -1 }, 'PUT'));
  await request('Update missing restaurant', '/api/restaurants/99999999', 404, json({ name: 'Missing' }, 'PUT'));

  const visit = await request('Create visit', '/api/visits', 201, json({ restaurantId, date: '2026-09-09', amountSpent: 12.34, notes: 'Temporary verification visit' }));
  visitId = visit.id;
  await request('List visits', '/api/visits', 200);
  await request('Invalid visit date and amount', '/api/visits', 400, json({ restaurantId, date: '2026-02-30', amountSpent: -1 }));
  await request('Missing visit restaurant', '/api/visits', 404, json({ restaurantId: 99999999, date: '2026-09-09', amountSpent: 1 }));

  const image = await readFile(new URL('../public/images/food-table-hero.png', import.meta.url));
  const photo = await request('Upload food photo', '/api/photos', 201, json({ visitId, caption: 'Temporary verification photo', mimeType: 'image/png', imageBase64: image.toString('base64') }));
  photoId = photo.id;
  await request('List photos', '/api/photos', 200);
  await request('Rate photo', `/api/photos/${photoId}/ratings`, 200, json({ rating: 5 }));
  await request('Invalid photo rating', `/api/photos/${photoId}/ratings`, 400, json({ rating: 8 }));
  await request('Delete photo', `/api/photos/${photoId}`, 204, { method: 'DELETE' });
  photoId = undefined;
  await request('Delete missing photo', '/api/photos/99999999', 404, { method: 'DELETE' });
  await request('Delete visit', `/api/visits/${visitId}`, 204, { method: 'DELETE' });
  visitId = undefined;
  await request('Delete missing visit', '/api/visits/99999999', 404, { method: 'DELETE' });
  await request('Delete restaurant', `/api/restaurants/${restaurantId}`, 204, { method: 'DELETE' });
  restaurantId = undefined;
  await request('Delete missing restaurant', '/api/restaurants/99999999', 404, { method: 'DELETE' });
} finally {
  if (photoId) await fetch(`${baseUrl}/api/photos/${photoId}`, { method: 'DELETE' }).catch(() => undefined);
  if (visitId) await fetch(`${baseUrl}/api/visits/${visitId}`, { method: 'DELETE' }).catch(() => undefined);
  if (restaurantId) await fetch(`${baseUrl}/api/restaurants/${restaurantId}`, { method: 'DELETE' }).catch(() => undefined);
}

console.table(checks);
const failures = checks.filter((check) => !check.passed);
if (failures.length) process.exitCode = 1;
else console.log(`\n${checks.length}/${checks.length} API checks passed; temporary data cleaned up.`);
