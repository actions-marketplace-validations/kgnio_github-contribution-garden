import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoCalendar, fetchCalendar, validateCalendar } from '../src/data.ts';
import { calendarMonthLabels, renderGarden } from '../src/render.ts';

test('calendar renders every day with its original count, both themes', () => {
  const c = validateCalendar(demoCalendar());
  for (const dark of [false, true]) {
    const svg = renderGarden(c, 'kgnio', dark, true);
    assert.equal((svg.match(/<title>\d{4}-/g) || []).length, 371);
    assert.ok(svg.includes('Demonstration with synthetic data.'));
    assert.ok(svg.includes('class="small">Oct</text>'));
    assert.ok(svg.includes('height="260" rx="16"'));
    assert.ok(!svg.includes('a year of little things growing'));
    assert.ok(!svg.includes('growing days'));
    assert.ok(!svg.includes('grow a little, every day.'));
    assert.ok(!svg.includes('width="1000" height="420"'));
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

test('month labels follow real date ranges, including month changes inside weeks', () => {
  const day = (date: string, weekday: number) => ({ date, weekday, contributionCount: 0, contributionLevel: 'NONE' });
  const weeks = Array.from({ length: 10 }, () => ({ contributionDays: [] as ReturnType<typeof day>[] }));
  weeks[0].contributionDays = [day('2026-01-31', 6)];
  weeks[1].contributionDays = [day('2026-02-01', 0)];
  weeks[4].contributionDays = [day('2026-02-28', 6)];
  weeks[5].contributionDays = [day('2026-03-01', 0)];
  weeks[9].contributionDays = [day('2026-03-31', 2)];
  assert.deepEqual(calendarMonthLabels({ totalContributions: 0, weeks }).map(({ key, x }) => ({ key, x })), [
    { key: '2026-01', x: 58 }, { key: '2026-02', x: 100.5 }, { key: '2026-03', x: 177 }
  ]);
  const boundary = { totalContributions: 0, weeks: [{ contributionDays: [day('2026-01-31', 6), day('2026-02-01', 0)] }, { contributionDays: [day('2026-02-02', 1)] }] };
  assert.deepEqual(calendarMonthLabels(boundary).map(l => l.key), ['2026-02']);
});

test('exact daily counts determine leaves and flower colors independently of GitHub intensity', () => {
  for (const dark of [false, true]) for (const [count, leaves, hue] of [
    [0, 0, null], [1, 1, null], [2, 2, null],
    [3, 2, '#f3b1a8'], [4, 2, '#f3b1a8'], [5, 2, '#edbd55'],
    [9, 2, '#edbd55'], [10, 2, '#bfaddf'], [19, 2, '#bfaddf'], [20, 2, '#fae6af'], [100, 2, '#fae6af']
  ] as const) {
    const calendar = { totalContributions: count, weeks: [{ contributionDays: [{ date: '2026-10-23', weekday: 5, contributionCount: count, contributionLevel: 'FIRST_QUARTILE' }] }] };
    const svg = renderGarden(calendar, 'demo', dark);
    assert.equal((svg.match(/fill="#(?:79ad67|94bd72)"/g) || []).length, leaves, String(count));
    assert.equal(svg.includes('class="sway"'), count > 0);
    assert.equal(svg.includes('<g transform="translate(0 -17)"'), count >= 3);
    if (hue) assert.ok(svg.includes('fill="' + hue + '"'));
  }
});
