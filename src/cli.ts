import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { demoCalendar, fetchCalendar } from './data.ts';
import { renderGarden } from './render.ts';

const args = process.argv.slice(2);
function option(name: string, fallback: string): string {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${name} requires a value`);
  return args[i + 1];
}
try {
  const user = option('--user', process.env.GITHUB_REPOSITORY_OWNER || (args.includes('--demo') ? 'demo' : ''));
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(user)) throw new Error('Invalid GitHub username');
  const demo = args.includes('--demo');
  const out = resolve(option('--out', 'dist'));
  const calendar = demo ? demoCalendar() : await fetchCalendar(user, process.env.GITHUB_TOKEN || '');
  await mkdir(out, { recursive: true });
  for (const dark of [false, true]) {
    await writeFile(resolve(out, `contribution-garden${dark ? '-dark' : ''}.svg`), renderGarden(calendar, user, dark, demo));
  }
  console.log(`${demo ? 'DEMO' : user}: 2 SVG files generated in ${out}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Generation failed');
  process.exitCode = 1;
}
