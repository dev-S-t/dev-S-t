// Small helpers shared by the panels: the two colours, compact path data, and the panel wrapper.
const PAPER = '#F3F1EC', INK = '#0D0D0C';
// light: black lines on paper; dark: light lines on ink (the site's two themes)
const theme = (mode) => (mode === 'dark' ? { bg: INK, fg: PAPER } : { bg: PAPER, fg: INK });

const r1 = (v) => Math.round(v * 10) / 10;
// polylines -> path data: an absolute move for each line, then short relative steps (keeps the files small)
function pathData(lines) {
  let d = '';
  for (const pl of lines) {
    if (pl.length < 2) continue;
    let px = r1(pl[0][0]), py = r1(pl[0][1]);
    d += 'M' + px + ' ' + py;
    let seg = 'l';
    for (let i = 1; i < pl.length; i++) {
      const x = r1(pl[i][0]), y = r1(pl[i][1]);
      const dx = r1(x - px), dy = r1(y - py);
      if (dx === 0 && dy === 0) continue;
      const sx = String(dx), sy = String(dy);
      seg += (seg.length > 1 && !sx.startsWith('-') ? ' ' : '') + sx + (sy.startsWith('-') ? '' : ' ') + sy;
      px = x; py = y;
    }
    d += seg.length > 1 ? seg : 'l0 0';
  }
  return d;
}
// split polylines wherever they leave a rectangle (with a margin), so nothing is drawn outside the panel
function clipLines(lines, x0, y0, x1, y1) {
  const out = [];
  for (const pl of lines) {
    let cur = [];
    for (const p of pl) {
      if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1) cur.push(p);
      else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
  }
  return out;
}
// Chaikin smoothing for contour lines
function smooth(pl, n = 2, closed = false) {
  let p = pl;
  for (let k = 0; k < n; k++) {
    const q = closed ? [] : [p[0]];
    const m = closed ? p.length : p.length - 1;
    for (let i = 0; i < m; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) q.push(p[p.length - 1]); else q.push(q[0]);
    p = q;
  }
  return p;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// a panel: its own ground colour, a title and description for screen readers. The README stacks the panels into
// one canvas, so only its outer corners are round: corners 'top' (the first panel), 'bottom' (the last) or 'none'.
function panel({ w, h, bg, title, desc, body, style = '', rx = 18, corners = 'none' }) {
  const t = corners === 'top' || corners === 'all' ? rx : 0, b = corners === 'bottom' || corners === 'all' ? rx : 0;
  const shape = `M0 ${t}A${t} ${t} 0 0 1 ${t} 0H${w - t}A${t} ${t} 0 0 1 ${w} ${t}V${h - b}A${b} ${b} 0 0 1 ${w - b} ${h}H${b}A${b} ${b} 0 0 1 0 ${h - b}Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">` +
    `<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>` +
    (style ? `<style>${style}</style>` : '') +
    `<defs><clipPath id="panel"><path d="${shape}"/></clipPath></defs>` +
    `<g clip-path="url(#panel)"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</g></svg>\n`;
}

// the site's seams between sections (SEAM in its lines.js)
// rule: a run of parallel rules of mixed weight across the top of a section
const RULES = [[3, 2.6], [8, 0.8], [12, 0.8], [17.5, 1.6], [24, 0.6], [30, 0.6]];
const ruleSeam = (w, fg, y0 = 0) => `<g fill="${fg}">` + RULES.map(([y, t]) => `<rect x="0" y="${(y0 + y - t / 2).toFixed(2)}" width="${w}" height="${t}"/>`).join('') + '</g>';
const RULE_H = 36;

module.exports = { PAPER, INK, theme, pathData, clipLines, smooth, esc, panel, r1, ruleSeam, RULE_H };
