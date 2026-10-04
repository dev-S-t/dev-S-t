// Contour lines, the site's terrain look: a height field sampled on a grid, cut into lines at even heights with
// marching squares. Plates and marks are "peaks" (as on the site, where data-peak plates lift the lines around
// them): the field rises around each one, so the contours ring it, and the lines stop short of it, thinning first.
const S = require('./svg.cjs'), N = require('./noise.cjs');

// rounded-rectangle signed distance (negative inside)
function sdBox(x, y, b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.min(b.r || 0, b.w / 2, b.h / 2);
  const qx = Math.abs(x - cx) - b.w / 2 + r, qy = Math.abs(y - cy) - b.h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function march(grid, nx, ny, x0, y0, cell, lv) {
  const P = (i, j) => grid[j * nx + i];
  const pts = new Map(), links = new Map();
  const edgePt = (key, ax, ay, bx, by, a, b) => {
    if (!pts.has(key)) { const t = (lv - a) / (b - a); pts.set(key, [x0 + (ax + (bx - ax) * t) * cell, y0 + (ay + (by - ay) * t) * cell]); }
    return key;
  };
  const link = (a, b) => { (links.get(a) || links.set(a, []).get(a)).push(b); (links.get(b) || links.set(b, []).get(b)).push(a); };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    const k = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
    if (k === 0 || k === 15) continue;
    const T = () => edgePt((j * nx + i) * 2, i, j, i + 1, j, a, b);
    const R = () => edgePt((j * nx + i + 1) * 2 + 1, i + 1, j, i + 1, j + 1, b, c);
    const B = () => edgePt(((j + 1) * nx + i) * 2, i, j + 1, i + 1, j + 1, d, c);
    const L = () => edgePt((j * nx + i) * 2 + 1, i, j, i, j + 1, a, d);
    const centre = (a + b + c + d) / 4 > lv;
    switch (k) {
      case 1: case 14: link(L(), B()); break;
      case 2: case 13: link(B(), R()); break;
      case 3: case 12: link(L(), R()); break;
      case 4: case 11: link(T(), R()); break;
      case 6: case 9: link(T(), B()); break;
      case 7: case 8: link(L(), T()); break;
      case 5: if (centre) { link(L(), T()); link(B(), R()); } else { link(L(), B()); link(T(), R()); } break;
      case 10: if (centre) { link(T(), R()); link(L(), B()); } else { link(L(), T()); link(B(), R()); } break;
    }
  }
  // walk the links into polylines: open ones from their ends first, then the closed loops
  const seen = new Set(), lines = [];
  const walk = (start) => {
    const line = [pts.get(start)]; seen.add(start); let prev = null, cur = start;
    for (;;) {
      const nb = (links.get(cur) || []).find((n) => n !== prev && !seen.has(n));
      if (nb === undefined) { const back = (links.get(cur) || []).find((n) => n === start && prev !== start && line.length > 2); if (back !== undefined) line.push(pts.get(start)); break; }
      seen.add(nb); line.push(pts.get(nb)); prev = cur; cur = nb;
    }
    return line;
  };
  for (const [key, nb] of links) if (nb.length === 1 && !seen.has(key)) lines.push(walk(key));
  for (const key of links.keys()) if (!seen.has(key)) lines.push(walk(key));
  return lines;
}

// draw a terrain
//   w, h: area; f(x, y): the base height; peaks: [{ box, lift, reach, clear }]; step: height between lines
//   width(levelIndex, x, y): stroke width before thinning near peaks
function draw({ w, h, x0 = 0, y0 = 0, cell = 3, f, peaks = [], step, width, smoothN = 1, levels }) {
  const nx = Math.ceil(w / cell) + 3, ny = Math.ceil(h / cell) + 3, gx0 = x0 - cell, gy0 = y0 - cell;
  const grid = new Float32Array(nx * ny);
  let lo = Infinity, hi = -Infinity;
  const sd = (x, y) => { let m = Infinity; for (const p of peaks) m = Math.min(m, sdBox(x, y, p.box) - (p.clear || 0)); return m; };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = gx0 + i * cell, y = gy0 + j * cell;
    let v = f(x, y);
    for (const p of peaks) { const d = Math.max(sdBox(x, y, p.box), 0); v += p.lift * Math.exp(-d / (p.reach || 44)); }
    grid[j * nx + i] = v; lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  const lv = levels || [];
  if (!levels) for (let k = Math.ceil(lo / step); k * step < hi; k++) lv.push(k);
  const groups = new Map();
  for (const k of lv) {
    for (let line of march(grid, nx, ny, gx0, gy0, cell, k * step)) {
      if (line.length < 3) continue;
      const closed = line.length > 3 && line[0] === line[line.length - 1];
      if (smoothN) line = S.smooth(closed ? line.slice(0, -1) : line, smoothN, closed);
      // split by width class; drop what falls in a clearing
      let cur = null, curW = -1;
      for (const p of line) {
        const d = sd(p[0], p[1]);
        const base = width(k, p[0], p[1]);
        let wv = base * N.smoothstep(0, 12, d) * (1 + 0.6 * Math.exp(-Math.max(d, 0) / 14));
        if (d <= 0.5 || wv < 0.18 || p[0] < x0 - 4 || p[0] > x0 + w + 4 || p[1] < y0 - 4 || p[1] > y0 + h + 4) { cur = null; curW = -1; continue; }
        wv = Math.round(wv / 0.15) * 0.15;
        if (wv !== curW) { if (cur) cur.push(p); cur = [p]; curW = wv; if (!groups.has(wv)) groups.set(wv, []); groups.get(wv).push(cur); }
        else cur.push(p);
      }
    }
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([wv, ls]) => `<path d="${S.pathData(ls.filter((l) => l.length > 1))}" stroke-width="${wv.toFixed(2)}"/>`).join('');
}

module.exports = { draw, sdBox };
