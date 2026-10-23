import type { Calendar } from './data.ts';

export const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));

export function calendarMonthLabels(calendar: Calendar, x0 = 58, step = 17): { key: string; label: string; x: number; span: number }[] {
  const ranges = new Map<string, { label: string; first: number; last: number }>();
  calendar.weeks.forEach((week, column) => week.contributionDays.forEach(day => {
    const key = day.date.slice(0, 7);
    const range = ranges.get(key);
    if (range) range.last = column;
    else ranges.set(key, {
      label: new Date(day.date + 'T00:00:00Z').toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      first: column, last: column
    });
  }));
  const labels: { key: string; label: string; x: number; span: number }[] = [];
  for (const [key, range] of ranges) {
    const item = { key, label: range.label, x: x0 + (range.first + range.last) / 2 * step, span: range.last - range.first };
    const previous = labels.at(-1);
    // Keep labels at their true month centers. Omit the narrower partial month
    // if adjacent labels would overlap, rather than shifting either month.
    if (previous && item.x - previous.x < 34) {
      if (item.span > previous.span) labels[labels.length - 1] = item;
    } else labels.push(item);
  }
  return labels;
}

type GardenPoint = { x: number; y: number };
export function gardenerMotion(calendar: Calendar): { route: GardenPoint[]; duration: number; frames: string; facingFrames: string; speed: number } {
  const width = Math.max(1, calendar.weeks.length - 1) * 17;
  const left = 66.5;
  const route: GardenPoint[] = [{ x: left, y: 135 }];
  // Asymmetric switchbacks visit all rows. A reserved left-side return lane
  // and bottom path close the loop without retracing any garden segment.
  const offsets = [0, 0.09, 0.03, 0.12, 0.05, 0.01, 0.07];
  for (let row = 0; row < 7; row++) {
    const y = 135 + row * 27;
    if (row > 0) route.push({ x: route.at(-1)!.x, y });
    const x = row % 2 === 0
      ? left + width * (1 - offsets[row])
      : left + width * (0.08 + offsets[row]);
    route.push({ x, y });
  }
  route.push({ x: route.at(-1)!.x, y: 315 }, { x: left, y: 315 }, { x: left, y: 135 });

  // The old 18-second animation had variable segment speeds. Halve its
  // average travel speed twice: one quarter of the original average speed.
  const active = calendar.weeks.flatMap((week, wi) => week.contributionDays
    .filter(day => day.contributionCount > 0)
    .map(day => ({ x: 58 + wi * 17, y: 126 + day.weekday * 27 })));
  const legacy = active.filter((_, i) => i % Math.max(1, Math.floor(active.length / 12)) === 0).slice(0, 12);
  if (!legacy.length) legacy.push({ x: 100, y: 180 }, { x: 820, y: 180 });
  const legacyDistance = legacy.reduce((sum, p, i) => {
    const next = legacy[(i + 1) % legacy.length];
    return sum + Math.hypot(next.x - p.x, next.y - p.y);
  }, 0);
  const speed = legacyDistance > 0 ? legacyDistance / 72 : 12;
  const distances = [0];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    distances.push(distances[i - 1] + Math.abs(b.x - a.x) + Math.abs(b.y - a.y));
  }
  const length = distances.at(-1)!;
  const frames = route.map((p, i) =>
    `${(distances[i] / length * 100).toFixed(8)}%{transform:translate(${p.x}px,${p.y}px)}`).join('');
  let facing = 1;
  const facingFrames = route.map((p, i) => {
    for (let ahead = 0; ahead < route.length - 1; ahead++) {
      const index = (i + ahead) % (route.length - 1);
      const a = route[index], b = route[index + 1];
      if (a.x !== b.x) { facing = Math.sign(b.x - a.x); break; }
    }
    return `${(distances[i] / length * 100).toFixed(8)}%{transform:scaleX(${facing})}`;
  }).join('');
  return { route, duration: length / speed, frames, facingFrames, speed };
}

export function renderGarden(calendar: Calendar, user: string, dark = false, demo = false): string {
  const p = dark ? { bg: '#101f1c', panel: '#172b24', text: '#edf5e5', muted: '#a4b9a7', soil: '#304438', soil2: '#385141', line: '#3e5847' } : { bg: '#faf8ef', panel: '#eef0df', text: '#263e30', muted: '#667c63', soil: '#dedfc5', soil2: '#d3d8b6', line: '#d0d6bd' };
  const x0 = 58, y0 = 126, step = 17, rowStep = 27;
  const active = calendar.weeks.flatMap((w, wi) => w.contributionDays.filter(d => d.contributionCount > 0).map(d => ({ x: x0 + wi * step, y: y0 + d.weekday * rowStep })));
  const flowers: string[] = [];
  calendar.weeks.forEach((week, wi) => week.contributionDays.forEach(day => {
    const x = x0 + wi * step, y = y0 + day.weekday * rowStep;
    const count = day.contributionCount;
    const level = Math.min(count, 3);
    const delay = (-(wi * 0.19 + day.weekday * 0.37)).toFixed(2);
    const duration = (5.6 + ((wi + day.weekday * 3) % 5) * 0.35).toFixed(2);
    const h = [0, 5, 9, 17][level];
    const hue = count >= 20 ? '#fae6af' : count >= 10 ? '#bfaddf' : count >= 5 ? '#edbd55' : '#f3b1a8';
    let plant = '';
    if (level > 0) {
      plant = `<g class="sway" style="animation-delay:${delay}s;animation-duration:${duration}s"><path d="M0 0 V-${h}" stroke="#72a260" stroke-width="1.6" stroke-linecap="round"/><path d="M0 -3 Q-7 -10 -5 -4 Q-3 -2 0 -3" fill="#79ad67"/>${level > 1 ? `<path d="M0 -5 Q7 -13 6 -7 Q4 -4 0 -5" fill="#94bd72"/>` : ''}${level > 2 ? `<g transform="translate(0 -${h})" fill="${hue}"><circle cy="-3" r="2.5"/><circle cx="3" r="2.5"/><circle cy="3" r="2.5"/><circle cx="-3" r="2.5"/><circle r="1.8" fill="#a17638"/></g>` : ''}</g>`;
      // A separate outer transform adds gusts without restarting the gentle sway.
      // Eight-second row slots keep each traveling wave on a single row.
      const gustDelay = (4 + day.weekday * 8 + wi * 0.03).toFixed(2);
      plant = `<g class="gust" style="animation-delay:${gustDelay}s">${plant}</g>`;
    }
    flowers.push(`<g transform="translate(${x} ${y})"><title>${day.date}: ${day.contributionCount} contributions</title><ellipse rx="6.3" ry="2.6" fill="${(wi + day.weekday) % 2 ? p.soil : p.soil2}"/>${plant}</g>`);
  }));
  const months = calendarMonthLabels(calendar, x0, step);
  const motion = gardenerMotion(calendar);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="956" height="260" viewBox="0 0 956 260" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(user)}'s contribution garden${demo ? ' — sample data' : ''}</title>
<desc id="desc">Each plot is one day. 0 contributions: bare soil. 1 contribution: one leaf. 2 contributions: two leaves. 3 or more: flowers colored by contribution count. ${calendar.totalContributions} contributions. A gardener waters the garden. ${demo ? 'Demonstration with synthetic data.' : 'GitHub contribution calendar.'}</desc>
<style>
text{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;fill:${p.text}}.small{font-size:10px;fill:${p.muted}}
.sway{animation:sway 6s ease-in-out infinite;transform-box:view-box;transform-origin:0px 0px}.gust{animation:gust 56s ease-in-out infinite;transform-box:view-box;transform-origin:0px 0px}.gardener{animation:walk ${motion.duration.toFixed(6)}s linear infinite}.facing{animation:face ${motion.duration.toFixed(6)}s steps(1,end) infinite;transform-box:view-box;transform-origin:0px 0px}.water{animation:water 1.5s ease-in infinite}.bee{animation:bee 12s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
@keyframes gust{0%,5%,100%{transform:rotate(0deg)}1%{transform:rotate(-12deg)}2%{transform:rotate(16deg)}3.5%{transform:rotate(-8deg)}}
@keyframes walk{${motion.frames}}
@keyframes face{${motion.facingFrames}}
@keyframes water{0%{opacity:0;transform:translate(0,0)}30%{opacity:.8}100%{opacity:0;transform:translate(4px,9px)}}
@keyframes bee{0%,100%{transform:translate(170px,112px)}35%{transform:translate(530px,165px)}70%{transform:translate(850px,110px)}}
@media(prefers-reduced-motion:reduce){.sway,.gust,.gardener,.facing,.water,.bee{animation:none}.gardener{transform:translate(${motion.route[0].x}px,${motion.route[0].y}px)}.bee{transform:translate(400px,105px)}}
</style>
<rect width="956" height="260" rx="16" fill="${p.panel}"/>
<g transform="translate(-22 -72)">
${months.map(month => `<text x="${month.x}" y="94" text-anchor="middle" class="small">${month.label}</text>`).join('')}
${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => `<text x="34" y="${y0 + i * rowStep}" class="small">${d}</text>`).join('')}
${flowers.join('')}
<path d="M38 321 H962" stroke="${p.line}" stroke-width="2" stroke-dasharray="2 5"/>
<g class="bee" transform="translate(400 105)"><ellipse cx="-2" cy="-4" rx="4" ry="2.5" fill="#cee7df"/><ellipse cx="3" cy="-4" rx="4" ry="2.5" fill="#cee7df"/><ellipse rx="5" ry="3" fill="#e7bc59"/><path d="M-1 -3 V3 M2 -2 V2" stroke="#66573c" stroke-width="1.5"/></g>
<g class="gardener" transform="translate(${motion.route[0].x} ${motion.route[0].y})"><g class="facing"><ellipse cy="1" rx="8" ry="2" fill="#14251c" opacity=".16"/><path d="M-3 -4 V0 M3 -4 V0" stroke="#526a55" stroke-width="3"/><rect x="-5" y="-13" width="10" height="9" rx="3" fill="#7797ad"/><circle cy="-17" r="4" fill="#edc5a1"/><path d="M-7 -20 H7 M-4 -22 H4" stroke="#cdac6c" stroke-width="3" stroke-linecap="round"/><path d="M4 -10 L10 -7" stroke="#edc5a1" stroke-width="2"/><path d="M10 -10 h6 v5 h-6z M16 -8 l5 3" fill="#88afb0" stroke="#88afb0" stroke-width="2"/><g class="water" fill="#89c4d1"><circle cx="21" cy="-3" r="1"/><circle cx="23" cy="-1" r="1"/><circle cx="19" cy="0" r="1"/></g></g></g>
</g>
</svg>`;
}
