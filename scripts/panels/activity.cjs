// Activity: the last year of contributions as a contour map. The calendar's grid is the ground (weeks across,
// days down); every day with contributions raises a hill as high as the square root of its count, so busy stretches
// become ranges of tight rings. The stick figure stands on the busiest day. Rebuilt daily by the GitHub Action.
const { execSync } = require('child_process');
const F = require('../lib/fonts.cjs'), N = require('../lib/noise.cjs'), S = require('../lib/svg.cjs'), TR = require('../lib/terrain.cjs');

const W = 900, OY = S.TEAR, H = 300 + OY + 26, LOGIN = 'dev-S-t';   // OY: the tear from Skills; 26: the tear into Case Studies
// motion: today's line pulses like the "now" mark on the site's timeline, and rings ripple out from the busiest day
const CSS = '.now{animation:now 3.7s ease-in-out infinite alternate}@keyframes now{from{opacity:.25}to{opacity:1}}' +
  '.pg{opacity:0;animation:pg 7s ease-out infinite}@keyframes pg{0%{opacity:0}6%{opacity:.85}26%{opacity:0}100%{opacity:0}}' + S.CALM;
const X0 = 46, X1 = 856, Y0 = 128 + OY, Y1 = 256 + OY;   // the calendar's area
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function calendar() {
  const token = process.env.GITHUB_TOKEN || execSync('gh auth token').toString().trim();
  const query = 'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount weekday}}}}}}';
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST', headers: { Authorization: 'bearer ' + token, 'Content-Type': 'application/json', 'User-Agent': LOGIN + '-profile' },
    body: JSON.stringify({ query, variables: { login: LOGIN } })
  });
  const j = await res.json();
  if (!j.data || !j.data.user) throw new Error('GitHub API: ' + JSON.stringify(j.errors || j).slice(0, 300));
  return j.data.user.contributionsCollection.contributionCalendar;
}

// the figure from the hero, small, feet at (fx, fy)
function figure(fx, fy, size, fg) {
  const R = 0.25, HT = 0.034, HIP = 0.2, ARM = 0.24, ST = 0.1, hy = -1 + R + HT * 1.2, neck = hy + R, sh = neck + (-HIP - neck) * 0.22;
  const P = ([x, y]) => (fx - x * size).toFixed(1) + ' ' + (fy + y * size).toFixed(1);
  const GA = -1.0472, GH = 0.2618, a0 = GA + GH, a1 = GA + 2 * Math.PI - GH;
  const ring = `M${P([R * Math.cos(a0), hy + R * Math.sin(a0)])}A${(R * size).toFixed(1)} ${(R * size).toFixed(1)} 0 1 0 ${P([R * Math.cos(a1), hy + R * Math.sin(a1)])}`;
  return `<g fill="none" stroke="${fg}" stroke-linecap="round"><path d="${ring}" stroke-width="${(HT * 2 * size).toFixed(2)}"/>` +
    `<path d="M${P([0, neck])}L${P([-0.01, -HIP])}" stroke-width="${(0.072 * size).toFixed(2)}"/>` +
    `<path d="M${P([0.55 * ARM, sh + 0.84 * ARM])}L${P([0, sh])}L${P([-0.42 * ARM, sh + 0.9 * ARM])}M${P([ST, 0])}L${P([0, -HIP])}L${P([-1.15 * ST, -0.02])}" stroke-width="${(0.056 * size).toFixed(2)}" stroke-linejoin="round"/></g>`;
}

async function files() {
  const cal = await calendar();
  const weeks = cal.weeks, nw = weeks.length, cw = (X1 - X0) / nw, rh = (Y1 - Y0) / 7;
  const days = [];
  weeks.forEach((w, i) => w.contributionDays.forEach((d) => days.push({ ...d, x: X0 + (i + 0.5) * cw, y: Y0 + (d.weekday + 0.5) * rh })));
  const active = days.filter((d) => d.contributionCount > 0);
  const top = active.reduce((a, b) => (b.contributionCount > (a ? a.contributionCount : 0) ? b : a), null);

  // the heading plate: the year's total as a striped numeral, and what it counts
  const total = String(cal.totalContributions), numSize = 66;
  const numW = F.width('num', total, numSize), lw = Math.max(F.width('data', 'contributions', 14, 0.02), F.width('data', 'in the last year', 14, 0.02));
  const plate = { x: 26, y: 24 + OY, w: 28 + numW + 18 + lw + 28, h: 92, r: 22 };
  const strip = { x: -20, y: 268 + OY, w: W + 40, h: 60, r: 0 };
  const summit = top ? { x: top.x - 13, y: top.y - 34, w: 26, h: 36, r: 10 } : null;
  const today = days[days.length - 1];
  const nowLine = { x: today.x - 4, y: Y0 - 8, w: 8, h: Y1 - Y0 + 14, r: 4 }, nowTag = { x: today.x - 17, y: Y0 - 30, w: 34, h: 20, r: 8 };
  const peaks = [{ box: plate, lift: 0.18, reach: 40 }, { box: strip, lift: 0, reach: 10 }, { box: nowLine, lift: 0, reach: 6 }, { box: nowTag, lift: 0, reach: 6 }].concat(summit ? [{ box: summit, lift: 0, reach: 10 }] : []);
  const sx = cw * 1.05, sy = rh * 0.95;
  const field = (x, y) => {
    let v = 0.24 * N.fbm(x / 250, y / 250, 4.4);
    for (const d of active) { const dx = x - d.x, dy = y - d.y; if (Math.abs(dx) < sx * 4 && Math.abs(dy) < sy * 4) v += 0.17 * Math.sqrt(d.contributionCount) * Math.exp(-(dx * dx) / (2 * sx * sx) - (dy * dy) / (2 * sy * sy)); }
    return v;
  };
  const width = (k, x, y) => (k % 4 === 0 ? 1.25 : 0.65) * N.mix(0.8, 1.25, N.smoothstep(-0.5, 0.6, N.sn(x / 280, y / 280)));

  // month names under the first week that starts in each month
  const months = []; let last = -1, lastX = -99;
  weeks.forEach((w, i) => { const m = +w.contributionDays[0].date.slice(5, 7) - 1; if (m !== last) { const x = X0 + i * cw; if (x - lastX > 30 && i < nw - 2) { months.push([MONTHS[m], x]); lastX = x; } last = m; } });

  const build = (mode) => {
    const { bg, fg } = S.theme(mode), T = F.glyphs();
    const lines = TR.draw({ w: W, h: H, f: field, peaks, step: 0.042, width, cell: 3.5 });
    const ny = plate.y + plate.h / 2;
    const text = T.use('num', total, plate.x + 26, ny + numSize * 0.36, numSize) +
      T.use('data', 'contributions', plate.x + 28 + numW + 18, ny - 4, 14, { ls: 0.02 }) + T.use('data', 'in the last year', plate.x + 28 + numW + 18, ny + 16, 14, { ls: 0.02 }) +
      months.map(([m, x]) => T.use('data', m, x, strip.y + 20, 12, { ls: 0.04 })).join('');
    const nowMark = `<g class="now"><path d="M${today.x.toFixed(1)} ${Y0 - 6}V${Y1 + 4}" stroke="${fg}" stroke-width="1.3"/><g fill="${fg}">${T.use('data', 'now', today.x, Y0 - 14, 11, { anchor: 'middle', ls: 0.04 })}</g></g>`;
    // three rings around the summit's clearing, lit one after another, so a ripple runs outward
    const rings = summit ? [5, 10, 15].map((o, k) => `<rect class="pg" style="animation-delay:${(k * 0.35).toFixed(2)}s" x="${(summit.x - o).toFixed(1)}" y="${(summit.y - o).toFixed(1)}" width="${(summit.w + 2 * o).toFixed(1)}" height="${(summit.h + 2 * o).toFixed(1)}" rx="${summit.r + o}" fill="none" stroke="${fg}" stroke-width="1.1"/>`).join('') : '';
    const body = `<g fill="none" stroke="${fg}" stroke-linecap="round" stroke-linejoin="round">${lines}</g>` +
      `<rect x="${plate.x}" y="${plate.y}" width="${plate.w.toFixed(1)}" height="${plate.h}" rx="${plate.r}" fill="${bg}"/>` +
      `<rect x="0" y="${strip.y}" width="${W}" height="${H - strip.y}" fill="${bg}"/>` +
      `<defs>${T.defs()}</defs><g fill="${fg}">${text}</g>` + nowMark + rings +
      (top ? figure(top.x, top.y, 30, fg) : '') + S.tearIn(W, 14, fg, 4.7) + S.tearOut(W, H, 18, fg, 8.9);
    const busiest = top ? ` The busiest day was ${top.date}, with ${top.contributionCount}.` : '';
    return S.panel({ w: W, h: H, bg, style: CSS, title: `${total} contributions in the last year`, desc: `Sahil Tomar's GitHub contributions over the last year drawn as a contour map: each day with contributions raises a hill.${busiest}`, body });
  };
  return { 'activity-light': build('light'), 'activity-dark': build('dark') };
}

module.exports = { files };
