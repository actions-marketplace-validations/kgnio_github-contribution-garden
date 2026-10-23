import { levels } from './data.ts';
import type { Calendar } from './data.ts';

export const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));

export function renderGarden(calendar: Calendar, user: string, dark = false, demo = false): string {
  const p = dark ? { bg: '#101f1c', panel: '#172b24', text: '#edf5e5', muted: '#a4b9a7', soil: '#304438', soil2: '#385141', line: '#3e5847' } : { bg: '#faf8ef', panel: '#eef0df', text: '#263e30', muted: '#667c63', soil: '#dedfc5', soil2: '#d3d8b6', line: '#d0d6bd' };
  const x0 = 58, y0 = 126, step = 17, rowStep = 27;
  const active = calendar.weeks.flatMap((w, wi) => w.contributionDays.filter(d => d.contributionCount > 0).map(d => ({ x: x0 + wi * step, y: y0 + d.weekday * rowStep })));
  const flowers: string[] = [];
  calendar.weeks.forEach((week, wi) => week.contributionDays.forEach(day => {
    const x = x0 + wi * step, y = y0 + day.weekday * rowStep;
    const level = levels.indexOf(day.contributionLevel);
    const delay = (-(wi * 0.19 + day.weekday * 0.37)).toFixed(2);
    const duration = (5.6 + ((wi + day.weekday * 3) % 5) * 0.35).toFixed(2);
    const h = [0, 5, 9, 13, 17][level];
    const hue = ['#f3b1a8', '#edbd55', '#bfaddf', '#fae6af'][(wi + day.weekday) % 4];
    let plant = '';
    if (level > 0) {
      plant = `<g class="sway" style="animation-delay:${delay}s;animation-duration:${duration}s"><path d="M0 0 V-${h}" stroke="#72a260" stroke-width="1.6" stroke-linecap="round"/><path d="M0 -3 Q-7 -10 -5 -4 Q-3 -2 0 -3" fill="#79ad67"/>${level > 1 ? `<path d="M0 -5 Q7 -13 6 -7 Q4 -4 0 -5" fill="#94bd72"/>` : ''}${level > 2 ? `<g transform="translate(0 -${h})" fill="${hue}"><circle cy="-3" r="2.5"/><circle cx="3" r="2.5"/><circle cy="3" r="2.5"/><circle cx="-3" r="2.5"/><circle r="1.8" fill="#a17638"/></g>` : ''}${level === 4 ? `<circle cx="5" cy="-12" r="1.4" fill="#e7ca62"/>` : ''}</g>`;
    }
    flowers.push(`<g transform="translate(${x} ${y})"><title>${day.date}: ${day.contributionCount} contributions</title><ellipse rx="6.3" ry="2.6" fill="${(wi + day.weekday) % 2 ? p.soil : p.soil2}"/>${plant}</g>`);
  }));
  const months: string[] = [];
  let previous = '';
  calendar.weeks.forEach((w, i) => {
    const date = w.contributionDays[0]?.date;
    if (!date) return;
    const month = date.slice(0, 7);
    if (month !== previous && (i === 0 || i < calendar.weeks.length - 2)) {
      months.push(`<text x="${x0 + i * step}" y="94" class="small">${new Date(date + 'T00:00:00Z').toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}</text>`);
    }
    previous = month;
  });
  // A sampled walking route through living plants. Animation is decorative;
  // plant heights always encode activity, never simulated contribution counts.
  const route = active.filter((_, i) => i % Math.max(1, Math.floor(active.length / 12)) === 0).slice(0, 12);
  if (!route.length) route.push({ x: 100, y: 180 }, { x: 820, y: 180 });
  const gardenerFrames = route.map((point, i) => `${(i / route.length * 100).toFixed(2)}% {transform:translate(${point.x}px,${point.y + 9}px)}`).join('') + `100%{transform:translate(${route[0].x}px,${route[0].y + 9}px)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="956" height="260" viewBox="0 0 956 260" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(user)}'s contribution garden${demo ? ' — sample data' : ''}</title>
<desc id="desc">Each plot is one day. No contributions: soil. Increasing activity: seedling, leaves, flower, full bloom. ${calendar.totalContributions} contributions. A gardener waters the garden. ${demo ? 'Demonstration with synthetic data.' : 'GitHub contribution calendar.'}</desc>
<style>
text{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;fill:${p.text}}.small{font-size:10px;fill:${p.muted}}
.sway{animation:sway 6s ease-in-out infinite;transform-box:view-box;transform-origin:0px 0px}.gardener{animation:walk 18s linear infinite}.water{animation:water 1.5s ease-in infinite}.bee{animation:bee 12s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
@keyframes walk{${gardenerFrames}}
@keyframes water{0%{opacity:0;transform:translate(0,0)}30%{opacity:.8}100%{opacity:0;transform:translate(4px,9px)}}
@keyframes bee{0%,100%{transform:translate(170px,112px)}35%{transform:translate(530px,165px)}70%{transform:translate(850px,110px)}}
@media(prefers-reduced-motion:reduce){.sway,.gardener,.water,.bee{animation:none}.gardener{transform:translate(850px,310px)}.bee{transform:translate(400px,105px)}}
</style>
<rect width="956" height="260" rx="16" fill="${p.panel}"/>
<g transform="translate(-22 -72)">
${months.join('')}
${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => `<text x="34" y="${y0 + i * rowStep}" class="small">${d}</text>`).join('')}
${flowers.join('')}
<path d="M38 321 H962" stroke="${p.line}" stroke-width="2" stroke-dasharray="2 5"/>
<g class="bee" transform="translate(400 105)"><ellipse cx="-2" cy="-4" rx="4" ry="2.5" fill="#cee7df"/><ellipse cx="3" cy="-4" rx="4" ry="2.5" fill="#cee7df"/><ellipse rx="5" ry="3" fill="#e7bc59"/><path d="M-1 -3 V3 M2 -2 V2" stroke="#66573c" stroke-width="1.5"/></g>
<g class="gardener" transform="translate(850 310)"><ellipse cy="1" rx="8" ry="2" fill="#14251c" opacity=".16"/><path d="M-3 -4 V0 M3 -4 V0" stroke="#526a55" stroke-width="3"/><rect x="-5" y="-13" width="10" height="9" rx="3" fill="#7797ad"/><circle cy="-17" r="4" fill="#edc5a1"/><path d="M-7 -20 H7 M-4 -22 H4" stroke="#cdac6c" stroke-width="3" stroke-linecap="round"/><path d="M4 -10 L10 -7" stroke="#edc5a1" stroke-width="2"/><path d="M10 -10 h6 v5 h-6z M16 -8 l5 3" fill="#88afb0" stroke="#88afb0" stroke-width="2"/><g class="water" fill="#89c4d1"><circle cx="21" cy="-3" r="1"/><circle cx="23" cy="-1" r="1"/><circle cx="19" cy="0" r="1"/></g></g>
</g>
</svg>`;
}
