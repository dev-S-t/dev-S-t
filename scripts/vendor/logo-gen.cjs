// The human-in-loop mark, drawn as brush strokes. Each stroke is a filled outline built from a centreline and a
// width profile: pressed at the start, thinning and lifting off at the end, a little uneven along the way.
// Geometry follows Sahil's sketch (viewBox 0..100): loop r 44, arms r 28.8 (centred a little higher, meeting the
// spine at the shoulders), head r 15.8, an S-shaped spine, legs as an arch standing on the loop. Refined after Allan
// Peters' teardown: all three rings on one vertical axis, and one wedge of OPEN degrees cuts every opening on the same
// ray, 30 degrees left of the top (11 o'clock).
const fs = require('fs');

const TAU = Math.PI * 2, rad = (d) => d * Math.PI / 180;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let DEC = 100;
const f2 = (v) => (Math.round(v * DEC) / DEC).toString();
// a small deterministic wobble
const wob = (t, seed, amp) => amp * (Math.sin(t * 5.3 + seed * 1.7) * 0.6 + Math.sin(t * 11.1 + seed * 3.1) * 0.4);

// centrelines: functions t in [0,1] -> [x, y]
function arc(cx, cy, r, gapAt, gap, seed, spiral = 0.02) {
  const a0 = rad(gapAt + gap / 2), a1 = rad(gapAt - gap / 2 + 360);
  return (t) => {
    const a = a0 + (a1 - a0) * t;
    const rr = r * (1 + wob(t, seed, 0.012) + spiral * (t - 0.5));
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
}
function cubic(p0, p1, p2, p3) {
  return (t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]); };
}
function arch(left, right, apexY, seed) {
  // a half ellipse from the left foot over the top to the right foot, sheared so both feet stand on the loop
  const cx = (left[0] + right[0]) / 2, rx = (right[0] - left[0]) / 2, midY = (left[1] + right[1]) / 2, ry = midY - apexY;
  const k = (right[1] - left[1]) / (right[0] - left[0]);
  return (t) => {
    const a = Math.PI + Math.PI * t;
    const x = cx + rx * Math.cos(a), y = midY + ry * Math.sin(a) * (1 + wob(t, seed, 0.04));
    return [x, y + (x - cx) * k];
  };
}

// width profile: base width, start 'press' (round, full) or 'taper', end 'lift' (thins to a point) or 'press'
// nib: how much the stroke's direction changes its width (1 = a brush held at 40 degrees, 0 = even all round)
function profile(t, { base, start = 'press', end = 'lift', seed = 0, swell = 0.24, lift = 0.16, dir = null, nib = 1, fade = 0, fn = null }) {
  if (fn) return fn(t);
  let w = base * (1 - swell + swell * Math.sin(Math.PI * Math.min(1, t * 1.15))) * (1 - fade * t);
  if (dir != null) w *= (1 - 0.42 * nib) + 0.52 * nib * Math.abs(Math.sin(dir - rad(40)));
  w *= 1 + wob(t * 2, seed + 7, 0.09) + wob(t * 13, seed + 3, 0.035); // pressure, and the grain of the brush
  if (start === 'taper') w *= 0.2 + 0.8 * smooth(0, 0.14, t);
  else w *= 0.86 + 0.14 * smooth(0, 0.05, t);
  if (end === 'lift') w *= 0.3 + 0.7 * (1 - smooth(1 - lift, 1, t));
  return w;
}

let SAMPLES = 180;
function outline(center, prof, N = SAMPLES) {
  const P = [], W = [];
  for (let i = 0; i <= N; i++) { const t = i / N; P.push(center(t)); }
  for (let i = 0; i <= N; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)]; W.push(profile(i / N, { ...prof, dir: Math.atan2(b[1] - a[1], b[0] - a[0]) })); }
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx, h = W[i] / 2;
    left.push([P[i][0] + nx * h, P[i][1] + ny * h]); right.push([P[i][0] - nx * h, P[i][1] - ny * h]);
  }
  // round caps: a half circle at each end
  const cap = (p, q, c, w) => { // from p to q around centre c
    const pts = [], a0 = Math.atan2(p[1] - c[1], p[0] - c[0]);
    for (let k = 1; k < 8; k++) { const a = a0 - Math.PI * k / 8; pts.push([c[0] + Math.cos(a) * w / 2, c[1] + Math.sin(a) * w / 2]); }
    return pts;
  };
  const ring = [...left, ...cap(left[N], right[N], P[N], W[N]), ...right.reverse(), ...cap(right[right.length - 1], left[0], P[0], W[0])];
  return 'M' + ring.map((p) => f2(p[0]) + ' ' + f2(p[1])).join('L') + 'Z';
}

// dry-brush streaks: thin gaps along the lifting end of a stroke
function streaks(center, prof, count = 3, from = 0.8) {
  const out = [];
  for (let s = 0; s < count; s++) {
    const off = (s - (count - 1) / 2) * 0.24, t0 = from + 0.05 * ((s * 5) % 3), pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = t0 + (1 - t0) * i / 40, a = center(Math.max(0, t - 0.004)), b = center(Math.min(1, t + 0.004));
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const p = center(t), w = profile(t, { ...prof, dir: Math.atan2(ty, tx) });
      pts.push([p[0] - ty * w * off, p[1] + tx * w * off]);
    }
    out.push('M' + pts.map((p) => f2(p[0]) + ' ' + f2(p[1])).join('L'));
  }
  return out;
}

const GAP = -120; // the openings: 30 degrees left of the top, 11 o'clock
const OPEN = 30;  // width of every opening, in degrees: one hour on a clock face, so at 11 o'clock it is the eleventh hour
const RINGS = { loop: [50, 50, 44], arms: [50, 47.4, 28.8], head: [50, 49.4, 15.8] };
function figure(weight = 1) {
  const headBottom = [RINGS.head[0], RINGS.head[1] + RINGS.head[2]], hip = [51.2, 85.6];
  return {
    spine: [cubic(headBottom, [54.4, 70.2], [47.4, 79.8], hip), { base: 3.4 * weight, seed: 4, start: 'press', end: 'press', swell: 0.2 }],
    legs: [arch([45.2, 93.6], [68.4, 90.2], 82.2, 4), { base: 3.4 * weight, seed: 5, start: 'taper', end: 'lift', swell: 0.2, lift: 0.18 }]
  };
}
function setPrecision(samples, decimals) { SAMPLES = samples; DEC = 10 ** decimals; }
function build({ weight = 1, texture = true, samples = 180, decimals = 2 } = {}) {
  setPrecision(samples, decimals);
  const loop = arc(...RINGS.loop, GAP, OPEN, 1, 0.025);
  const arms = arc(...RINGS.arms, GAP, OPEN, 2, 0.03);
  const head = arc(...RINGS.head, GAP, OPEN, 3, 0.03);
  const { spine, legs } = figure(weight);
  const strokes = [
    [loop, { base: 5.4 * weight, seed: 1, swell: 0.22 }],
    // the arms stay slim and even, so they read as arms rather than another heavy ring
    [arms, { base: 3.6 * weight, seed: 2, swell: 0.05, nib: 0.3 }],
    [head, { base: 4.3 * weight, seed: 3, swell: 0.18 }],
    spine, legs
  ];
  const paths = strokes.map(([c, p]) => outline(c, p));
  const gaps = texture ? strokes.filter(([, p]) => p.end === 'lift').flatMap(([c, p]) => streaks(c, p, p.base > 5 * weight ? 3 : 2)) : [];
  return { paths, gaps };
}

function svg({ weight = 1, texture = true, id = 'hil', attrs = '', title = '', samples = 180, decimals = 2 } = {}) {
  const { paths, gaps } = build({ weight, texture, samples, decimals });
  const mask = gaps.length ? `<mask id="${id}-dry" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/><path d="${gaps.join('')}" fill="none" stroke="#000" stroke-width=".34" stroke-linecap="round"/></mask>` : '';
  return `<svg viewBox="0 0 100 100"${attrs}>${title ? `<title>${title}</title>` : ''}${mask}<path fill="currentColor"${gaps.length ? ` mask="url(#${id}-dry)"` : ''} d="${paths.join('')}"/></svg>`;
}

function favicon() {
  const { paths } = build({ weight: 1.5, texture: false, samples: 64, decimals: 1 });
  // ink on a paper disc, so it reads on light and dark tab strips alike
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#F3F1EC"/><path fill="#0D0D0C" d="' + paths.join('') + '"/></svg>';
}
module.exports = { svg, build, favicon, arc, cubic, arch, profile, outline, streaks, figure, setPrecision, GAP, OPEN, RINGS, wob, smooth, rad, f2: (v) => f2(v) };
if (require.main === module) {
  const out = __dirname + '/';
  fs.writeFileSync(out + 'logo.svg', svg({ attrs: ' xmlns="http://www.w3.org/2000/svg" width="400" height="400"' }));
  fs.writeFileSync(out + 'logo-bold.svg', svg({ weight: 1.45, texture: false, attrs: ' xmlns="http://www.w3.org/2000/svg" width="64" height="64"' }));
  const inl = svg({ attrs: ' class="mark" aria-hidden="true" focusable="false"' });
  console.log('mark bytes', inl.length);
}
