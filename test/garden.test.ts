import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoCalendar, fetchCalendar, validateCalendar } from '../src/data.ts';
import { renderGarden } from '../src/render.ts';

test('calendar renders every day with its original count, both themes', () => {
  const c = validateCalendar(demoCalendar());
  for (const dark of [false, true]) {
    const svg = renderGarden(c, 'kgnio', dark, true);
    assert.equal((svg.match(/<title>\d{4}-/g) || []).length, 371);
    assert.ok(svg.includes('Demonstration with synthetic data.'));
    assert.ok(!svg.includes('<text'), 'only garden artwork should be visible');
    for (const week of c.weeks) for (const day of week.contributionDays) assert.ok(svg.includes(`${day.date}: ${day.contributionCount} contributions`));
    assert.ok(!svg.includes('NaN'));
  }
});
test('empty activity renders without a broken walking route', () => {
  const svg = renderGarden({ totalContributions: 0, weeks: [{ contributionDays: [] }] }, '<script>');
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('NaN'));
  assert.ok(svg.includes('0 contributions.'));
});
test('bad calendar is rejected', () => {
  assert.throws(() => validateCalendar({ totalContributions: 0, weeks: [{ contributionDays: [{ date: 'bad' }] }] }));
});
test('API errors do not fall back to invented contributions', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ errors: [{ message: 'Denied' }] }), { status: 200 });
    await assert.rejects(fetchCalendar('kgnio', 'test-only'), /Denied/);
    globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
    await assert.rejects(fetchCalendar('kgnio', 'test-only'), /503/);
  } finally { globalThis.fetch = original; }
});
