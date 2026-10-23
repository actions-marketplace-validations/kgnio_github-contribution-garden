export type Day = { date: string; weekday: number; contributionCount: number; contributionLevel: string };
export type Calendar = { totalContributions: number; weeks: { contributionDays: Day[] }[] };
export const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];

export function validateCalendar(value: unknown): Calendar {
  const c = value as Calendar;
  if (!c || !Number.isInteger(c.totalContributions) || c.totalContributions < 0 || !Array.isArray(c.weeks) || c.weeks.length < 1 || c.weeks.length > 54) throw new Error('Invalid contribution calendar');
  const seen = new Set<string>();
  for (const week of c.weeks) {
    if (!Array.isArray(week.contributionDays) || week.contributionDays.length > 7) throw new Error('Invalid week');
    for (const d of week.contributionDays) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || seen.has(d.date) || !Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6 || !Number.isInteger(d.contributionCount) || d.contributionCount < 0 || !levels.includes(d.contributionLevel)) throw new Error('Invalid contribution day');
      seen.add(d.date);
    }
  }
  return c;
}

export async function fetchCalendar(user: string, token: string): Promise<Calendar> {
  if (!token) throw new Error('GITHUB_TOKEN is required. For an offline preview, run: npm run demo');
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST', signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'contribution-garden' },
    body: JSON.stringify({ query: `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date weekday contributionCount contributionLevel } } } } } }`, variables: { login: user } })
  });
  if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
  const payload = await response.json() as { errors?: { message: string }[]; data?: { user?: { contributionsCollection: { contributionCalendar: Calendar } } } };
  if (payload.errors?.length) throw new Error(payload.errors.map(e => e.message).join('; '));
  if (!payload.data?.user) throw new Error('GitHub user not found');
  return validateCalendar(payload.data.user.contributionsCollection.contributionCalendar);
}

// Reproducible sample, never presented as real GitHub activity.
export function demoCalendar(): Calendar {
  const weeks: Calendar['weeks'] = [];
  let total = 0;
  let seed = 8021;
  for (let w = 0; w < 53; w++) {
    const contributionDays: Day[] = [];
    for (let d = 0; d < 7; d++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const level = seed % 5;
      const count = [0, 2, 5, 10, 18][level]; total += count;
      contributionDays.push({ date: new Date(Date.UTC(2025, 9, 19 + w * 7 + d)).toISOString().slice(0, 10), weekday: d, contributionCount: count, contributionLevel: levels[level] });
    }
    weeks.push({ contributionDays });
  }
  return { totalContributions: total, weeks };
}
