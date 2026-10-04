// The site's noise (assets/js/lines.js): 2D simplex noise `sn` and the warped fbm, ported from its shader so the
// lines bend the same way they do on human-in-loop.dev.
const mod289 = (x) => x - Math.floor(x / 289) * 289;
const perm = (x) => mod289(((x * 34) + 1) * x);
const fract = (x) => x - Math.floor(x);
const Cx = 0.211324865405187, Cy = 0.366025403784439, Cz = -0.577350269189626, Cw = 0.024390243902439;

function sn(vx, vy) {
  const s = (vx + vy) * Cy;
  let ix = Math.floor(vx + s), iy = Math.floor(vy + s);
  const t = (ix + iy) * Cx;
  const x0x = vx - ix + t, x0y = vy - iy + t;
  const i1x = x0x > x0y ? 1 : 0, i1y = 1 - i1x;
  const ax = x0x + Cx - i1x, ay = x0y + Cx - i1y, bx = x0x + Cz, by = x0y + Cz;
  ix = mod289(ix); iy = mod289(iy);
  const p0 = perm(perm(iy) + ix), p1 = perm(perm(iy + i1y) + ix + i1x), p2 = perm(perm(iy + 1) + ix + 1);
  let m0 = Math.max(0.5 - (x0x * x0x + x0y * x0y), 0), m1 = Math.max(0.5 - (ax * ax + ay * ay), 0), m2 = Math.max(0.5 - (bx * bx + by * by), 0);
  m0 *= m0; m0 *= m0; m1 *= m1; m1 *= m1; m2 *= m2; m2 *= m2;
  const q0 = 2 * fract(p0 * Cw) - 1, q1 = 2 * fract(p1 * Cw) - 1, q2 = 2 * fract(p2 * Cw) - 1;
  const h0 = Math.abs(q0) - 0.5, h1 = Math.abs(q1) - 0.5, h2 = Math.abs(q2) - 0.5;
  const a0 = q0 - Math.floor(q0 + 0.5), a1 = q1 - Math.floor(q1 + 0.5), a2 = q2 - Math.floor(q2 + 0.5);
  m0 *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h0 * h0);
  m1 *= 1.79284291400159 - 0.85373472095314 * (a1 * a1 + h1 * h1);
  m2 *= 1.79284291400159 - 0.85373472095314 * (a2 * a2 + h2 * h2);
  return 130 * (m0 * (a0 * x0x + h0 * x0y) + m1 * (a1 * ax + h1 * ay) + m2 * (a2 * bx + h2 * by));
}

function fbm(qx, qy, t) {
  const wx = sn(qx * 0.7 + t, qy * 0.7 - 0.7 * t), wy = sn(qx * 0.7 + 5.2 - 0.6 * t, qy * 0.7 + 1.3 + t);
  return 0.62 * sn(qx + 0.55 * wx, qy + 0.55 * wy + t)
    + 0.26 * sn(qx * 2.03 - 0.4 * wx - t * 0.5, qy * 2.03 - 0.4 * wy - t * 0.5)
    + 0.12 * sn(qx * 4.1 + t, qy * 4.1 + t);
}

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

module.exports = { sn, fbm, smoothstep, mix, hash, fract };
