import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoCalendar, fetchCalendar, validateCalendar } from '../src/data.ts';
import { calendarMonthLabels, gardenerMotion, renderGarden } from '../src/render.ts';

test('calendar renders every day with its original count, both themes', () => {
  const c = validateCalendar(demoCalendar());
  for (const dark of [false, true]) {
    const svg = renderGarden(c, 'kgnio', dark, true);
    assert.equal((svg.match(/<title>\d{4}-/g) || []).length, 371);
    assert.ok(svg.includes('Demonstration with synthetic data.'));
    assert.ok(svg.includes('class="small">Oct</text>'));
    assert.ok(svg.includes('height="240" rx="16"'));
    assert.ok(svg.includes('viewBox="0 0 956 240"'));
    assert.ok(!svg.includes('stroke-dasharray'));
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

test('gardener follows a closed orthogonal route at constant quarter-average legacy speed', () => {
  const calendar = { totalContributions: 2, weeks: [
    { contributionDays: [{ date: '2026-10-01', weekday: 4, contributionCount: 1, contributionLevel: 'FIRST_QUARTILE' }] },
    { contributionDays: [{ date: '2026-10-08', weekday: 4, contributionCount: 1, contributionLevel: 'FIRST_QUARTILE' }] }
  ] };
  const motion = gardenerMotion(calendar);
  assert.deepEqual(motion.route[0], motion.route.at(-1));
  assert.ok(Math.abs(motion.speed - 34 / 72) < 1e-10);
  const percentages = [...motion.frames.matchAll(/([\d.]+)%/g)].map(m => Number(m[1]));
  let distance = 0, horizontal = false, vertical = false;
  for (let i = 1; i < motion.route.length; i++) {
    const a = motion.route[i - 1], b = motion.route[i];
    assert.ok(a.x === b.x || a.y === b.y, 'no diagonal movement');
    horizontal ||= a.x !== b.x; vertical ||= a.y !== b.y;
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    const elapsed = (percentages[i] - percentages[i - 1]) / 100 * motion.duration;
    assert.ok(Math.abs(length / elapsed - motion.speed) < 0.00001);
    distance += length;
  }
  assert.ok(horizontal && vertical);
  assert.ok(Math.abs(motion.duration - distance / motion.speed) < 1e-8);
  assert.deepEqual(gardenerMotion(calendar), motion, 'repeatable random-looking route');
});

test('gardener uses short runs, changes rows often, and sometimes climbs', () => {
  const motion = gardenerMotion(demoCalendar());
  const width = 52 * 17;
  let horizontalRuns = 0, rowChanges = 0, climbs = 0;
  for (let i = 1; i < motion.route.length; i++) {
    const a = motion.route[i - 1], b = motion.route[i];
    if (a.y === b.y) {
      horizontalRuns++;
      assert.ok(Math.abs(b.x - a.x) <= width * .14 + 1e-8, 'horizontal run stays short');
      assert.ok(a.x > 66.5 && a.x < 66.5 + width, 'route avoids row edges');
      assert.ok(b.x > 66.5 && b.x < 66.5 + width, 'route avoids row edges');
    } else {
      rowChanges++;
      if (b.y < a.y) climbs++;
      assert.equal(Math.abs(b.y - a.y), 27, 'changes one row at a time');
    }
  }
  assert.ok(horizontalRuns >= 20);
  assert.ok(rowChanges > horizontalRuns);
  assert.ok(climbs >= 8);
});

test('gardener turns to face horizontal travel and never retraces a segment', () => {
  const { route, frames, facingFrames } = gardenerMotion(demoCalendar());
  const signs = [...facingFrames.matchAll(/scaleX\((-?1)\)/g)].map(m => Number(m[1]));
  assert.equal(signs.length, route.length);
  assert.equal(signs[0], signs.at(-1));
  assert.equal([...frames.matchAll(/%/g)].length, route.length);
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    if (a.x !== b.x) assert.equal(signs[i], Math.sign(b.x - a.x));
    for (let j = i + 1; j < route.length - 1; j++) {
      const c = route[j], d = route[j + 1];
      if (a.y === b.y && c.y === d.y && a.y === c.y)
        assert.ok(Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) <= Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)));
      if (a.x === b.x && c.x === d.x && a.x === c.x)
        assert.ok(Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) <= Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)));
    }
  }
});
