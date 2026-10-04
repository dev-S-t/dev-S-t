// Marks of tools, from the open Simple Icons set (CC0), drawn the way the site draws them: horizontal lines that
// are thick inside the mark (the hero name's trick). Fetched once into scripts/.fonts/icons.
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', '.fonts', 'icons');
const VER = { linkedin: 13, playwright: 11 }; // marks that left the set after those versions (as on the site)

const cache = {};
async function load(slug) {
  if (cache[slug]) return cache[slug];
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, slug + '.svg');
  if (!fs.existsSync(file)) {
    const res = await fetch('https://cdn.jsdelivr.net/npm/simple-icons@' + (VER[slug] || 16) + '/icons/' + slug + '.svg');
    if (!res.ok) throw new Error('no icon ' + slug);
    fs.writeFileSync(file, await res.text());
  }
  const d = fs.readFileSync(file, 'utf8').match(/<path d="([^"]+)"/)[1];
  cache[slug] = { d, box: bbox(d) };
  return cache[slug];
}

// the ink box of path data (curves and arcs sampled), so each mark can be cropped to itself like on the site
function bbox(d) {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g); let i = 0;
  const num = () => parseFloat(tok[i++]);
  const flag = () => { const t = tok[i]; if (t.length > 1 && /^[01]/.test(t)) { tok[i] = t.slice(1); return +t[0]; } i++; return +t; };
  let x = 0, y = 0, sx = 0, sy = 0, cmd = '', pcx = 0, pcy = 0, b = [Infinity, Infinity, -Infinity, -Infinity];
  const add = (px, py) => { b[0] = Math.min(b[0], px); b[1] = Math.min(b[1], py); b[2] = Math.max(b[2], px); b[3] = Math.max(b[3], py); };
  const cubic = (x1, y1, x2, y2, x3, y3) => { for (let k = 1; k <= 16; k++) { const t = k / 16, u = 1 - t; add(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3); } };
  const quad = (x1, y1, x2, y2) => { for (let k = 1; k <= 16; k++) { const t = k / 16, u = 1 - t; add(u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2); } };
  const arc = (rx, ry, rot, fa, fs, x2, y2) => {
    rx = Math.abs(rx); ry = Math.abs(ry); if (!rx || !ry) { add(x2, y2); return; }
    const ph = rot * Math.PI / 180, cp = Math.cos(ph), sp = Math.sin(ph);
    const dx = (x - x2) / 2, dy = (y - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    let lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let co = Math.sqrt(Math.max(0, num2 / den)); if (fa === fs) co = -co;
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx, cx = cp * cxp - sp * cyp + (x + x2) / 2, cy = sp * cxp + cp * cyp + (y + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry); let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    for (let k = 1; k <= 24; k++) { const t = t1 + dt * k / 24; add(cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp); }
  };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), c = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (c === 'Z') { x = sx; y = sy; continue; }
    if (c === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; add(x, y); cmd = rel ? 'l' : 'L'; pcx = x; pcy = y; continue; }
    if (c === 'L') { x = ox + num(); y = oy + num(); add(x, y); pcx = x; pcy = y; continue; }
    if (c === 'H') { x = ox + num(); add(x, y); pcx = x; pcy = y; continue; }
    if (c === 'V') { y = oy + num(); add(x, y); pcx = x; pcy = y; continue; }
    if (c === 'C') { const a = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]; cubic(...a); pcx = a[2]; pcy = a[3]; x = a[4]; y = a[5]; continue; }
    if (c === 'S') { const x1 = 2 * x - pcx, y1 = 2 * y - pcy, a = [ox + num(), oy + num(), ox + num(), oy + num()]; cubic(x1, y1, ...a); pcx = a[0]; pcy = a[1]; x = a[2]; y = a[3]; continue; }
    if (c === 'Q') { const a = [ox + num(), oy + num(), ox + num(), oy + num()]; quad(...a); pcx = a[0]; pcy = a[1]; x = a[2]; y = a[3]; continue; }
    if (c === 'T') { const x1 = 2 * x - pcx, y1 = 2 * y - pcy, a = [ox + num(), oy + num()]; quad(x1, y1, ...a); pcx = x1; pcy = y1; x = a[0]; y = a[1]; continue; }
    if (c === 'A') { const rx = num(), ry = num(), rot = num(), fa = flag(), fs = flag(), x2 = ox + num(), y2 = oy + num(); arc(rx, ry, rot, fa, fs, x2, y2); x = x2; y = y2; pcx = x; pcy = y; continue; }
    i++;
  }
  return { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] };
}

// one mark at (cx, cy), fitted into a box maxW x maxH; lines every `sp` px, drawn at 86% of that (as the site does)
let uid = 0;
function mark(ic, cx, cy, maxW, maxH, fg, lines = 15) {
  const { d, box } = ic, k = Math.min(maxW / box.w, maxH / box.h), w = box.w * k, h = box.h * k;
  const x0 = cx - w / 2, y0 = cy - h / 2, sp = h / lines, id = 'm' + (++uid);
  let st = '';
  for (let y = sp / 2; y < h; y += sp) st += `M${(x0 - 1).toFixed(1)} ${(y0 + y).toFixed(2)}h${(w + 2).toFixed(1)}`;
  return `<clipPath id="${id}"><path transform="translate(${(x0 - box.x * k).toFixed(2)} ${(y0 - box.y * k).toFixed(2)}) scale(${k.toFixed(4)})" d="${d}"/></clipPath>` +
    `<path clip-path="url(#${id})" d="${st}" stroke="${fg}" stroke-width="${(sp * 0.86).toFixed(2)}" fill="none"/>`;
}

module.exports = { load, mark, bbox };
