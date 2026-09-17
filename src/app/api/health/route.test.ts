import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from './route';

test('GET /api/health returns 200 with ok:true', async () => {
  const res = await GET();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});