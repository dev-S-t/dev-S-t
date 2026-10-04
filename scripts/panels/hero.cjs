// The header: the home page's hero from human-in-loop.dev, drawn as vectors. One spiral line runs out of the
// tunnel; inside the name it is drawn thick, so the name is made of the spiral. The handle is cut out of the lines,
// the figure from the mark stands on the cliff, and the title sits on the rock. Everything follows the site's
// shader (assets/js/lines.js, scene 0) at 72% of its size.
const F = require('../lib/fonts.cjs'), N = require('../lib/noise.cjs'), S = require('../lib/svg.cjs');
const G = require('../vendor/logo-gen.cjs'), LT = require('../vendor/lettering.cjs');

const W = 900, H = 600;
const s = 0.72;                    // site px -> panel px
const HS = H / s;                  // the hero's height in site px
const C = [W * 0.36, H * 0.4];     // the tunnel's centre (the site's 0.36, 0.4)
const T = 7.3;                     // a moment in the site's slowly changing noise
const PAD = 40;                    // the page margin
const TIP = 0.5, TOP = 0.7;        // where the cliff's face is (share of the width) and its top (share of the height)

const noiseAt = (x, y) => N.fbm(x / s / 460, y / s / 460, T * 0.03);
const wvarAt = (x, y) => N.mix(0.6, 1.8, N.smoothstep(-0.55, 0.75, N.sn(x / s / 330, y / s / 330 + T * 0.01)));
const finv = (fr) => Math.pow(fr / 1.41, 1 / 0.641) - 2;              // ring number -> radius (site px)
const spacing = (rr) => Math.pow(rr + 2, 0.359) / (1.41 * 0.641) * s; // distance between rings at that radius (panel px)

// the name, laid out like .n1 / .n2 on the site
function nameLayout() {
  const ls = -0.02, avail = W - 2 * PAD;
  const size = avail * 0.985 / (F.width('name', 'Tomar', 100, ls) / 100);
  const y1 = C[1] - 0.05 * size, y2 = y1 + 0.84 * size;
  const wS = F.width('name', 'Sahil', size, ls), wT = F.width('name', 'Tomar', size, ls);
  const rightEdge = PAD + wT, room = rightEdge - (PAD + wS) - size * 0.16;
  const s2 = Math.min(size * 0.34, room / (F.width('name', '(dev-S-t)', 100, 0.01) / 100));
  const x2 = rightEdge - F.width('name', '(dev-S-t)', s2, 0.01);
  return {
    size, s2,
    n1: F.text('name', 'Sahil', PAD, y1, size, { ls }) + F.text('name', 'Tomar', PAD, y2, size, { ls }),
    n2: F.text('name', '(dev-S-t)', x2, y1, s2, { ls: 0.01 }),
    box: [PAD - 6, y1 - size * 0.8, rightEdge + 6, y2 + size * 0.06]
  };
}

// the spiral, sampled along its length; each point keeps its thin width and its width inside the name
function spiral(box) {
  const pts = []; let u = 2.3;
  const uMax = 1.41 * Math.pow(Math.hypot(W - C[0], H - C[1]) / s + 110, 0.641);
  while (u < uMax) {
    const th = 2 * Math.PI * u, rrT = finv(u), ct = Math.cos(th), st = Math.sin(th);
    let r = rrT, rough = 0;
    for (let i = 0; i < 4; i++) { rough = N.smoothstep(0.55 * HS, 1.2 * HS, r); r = rrT - noiseAt(C[0] + r * s * ct, C[1] + r * s * st) * (4 + 90 * rough); }
    const x = C[0] + r * s * ct, y = C[1] + r * s * st, ro = Math.max(r * s, 0.5);
    const w = N.mix(0.7, 1.25, rough) * wvarAt(x, y) * 0.8;
    const inBox = x > box[0] && x < box[2] && y > box[1] && y < box[3];
    pts.push([x, y, w, inBox ? Math.max(w, 0.84 * spacing(rrT)) : 0]);
    const ds = Math.max(1.2, Math.min(Math.sqrt(1.2 * ro), N.mix(14, 4.5, Math.sqrt(rough))));
    u += Math.min(1 / 24, ds / (2 * Math.PI * ro));
  }
  return pts;
}

// group a run of points into paths by (rounded) stroke width
function byWidth(pts, idx, step, keep) {
  const groups = new Map(); let cur = null, curW = -1;
  for (const p of pts) {
    const inside = keep(p) && p[0] > -8 && p[0] < W + 8 && p[1] > -8 && p[1] < H + 8;
    if (!inside) { cur = null; curW = -1; continue; }
    const w = Math.max(step, Math.round(p[idx] / step) * step);
    if (w !== curW) { if (cur) cur.push([p[0], p[1]]); cur = [[p[0], p[1]]]; curW = w; if (!groups.has(w)) groups.set(w, []); groups.get(w).push(cur); }
    else cur.push([p[0], p[1]]);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

// the cliff's top edge (the site's cliffTop, panel px)
function cliffTop(x) {
  const u = x / W, xs = x / s;
  const ridge = H * (0.955 - 0.025 * (0.5 + 0.5 * N.sn(xs / 170, 1.7)) - 0.012 * N.sn(xs / 41, 4.1));
  const rough = N.smoothstep(TIP + 0.015, TIP + 0.09, u);
  const top = H * TOP - H * 0.035 * N.smoothstep(TIP + 0.08, 1, u) + rough * (H * 0.014 * N.sn(xs / 60, 9.3) + H * 0.006 * N.sn(xs / 17, 2.2));
  return N.mix(ridge, top, N.smoothstep(TIP - 0.035, TIP - 0.004, u));
}

// the figure: the stick man from the mark, as on the cliff (FIG_* in the site's shader), mirrored like there
function figure(fx, fy, size, fg) {
  const R = 0.25, HT = 0.034, BODY = 0.036, LIMB = 0.026, HIP = 0.2, ARM = 0.24, ST = 0.1;
  const hy = -1 + R + HT * 1.2, neck = hy + R, sh = neck + (-HIP - neck) * 0.22;
  const P = ([x, y]) => [fx - x * size, fy + y * size];
  const seg = (a, b, hw) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<path d="M${S.r1(x1)} ${S.r1(y1)}L${S.r1(x2)} ${S.r1(y2)}" stroke-width="${(2 * hw * size).toFixed(2)}"/>`; };
  // the head ring: open at 11 o'clock (after the mirror), thick where it starts and thinning as it goes round
  const GA = -1.0472, GH = 0.2618, n = 64, outer = [], inner = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = GA + GH + t * (2 * Math.PI - 2 * GH), th = HT * N.mix(1.2, 0.7, t);
    outer.push(P([(R + th) * Math.cos(a), hy + (R + th) * Math.sin(a)])); inner.push(P([(R - th) * Math.cos(a), hy + (R - th) * Math.sin(a)]));
  }
  const ring = 'M' + outer.concat(inner.reverse()).map((p) => S.r1(p[0]) + ' ' + S.r1(p[1])).join('L') + 'Z';
  const e1 = P([R * Math.cos(GA + GH), hy + R * Math.sin(GA + GH)]), e2 = P([R * Math.cos(GA - GH), hy + R * Math.sin(GA - GH)]);
  return `<g fill="${fg}"><path d="${ring}"/><circle cx="${S.r1(e1[0])}" cy="${S.r1(e1[1])}" r="${(HT * 1.2 * size).toFixed(2)}"/><circle cx="${S.r1(e2[0])}" cy="${S.r1(e2[1])}" r="${(HT * 0.7 * size).toFixed(2)}"/></g>` +
    `<g stroke="${fg}" stroke-linecap="round" fill="none">` +
    seg([0, neck], [-0.01, -HIP], BODY) +
    seg([0, sh], [0.55 * ARM, sh + 0.84 * ARM], LIMB) + seg([0, sh], [-0.42 * ARM, sh + 0.9 * ARM], LIMB) +
    seg([0, -HIP], [ST, 0], LIMB * 1.15) + seg([-0.01, -HIP], [-1.15 * ST, -0.02], LIMB * 1.15) + '</g>';
}

// the brand lockup from the nav: the mark with its brush streaks and the lettering, eyes in the "oo"
function lockup(x, y, h, fg, bg) {
  const vb = LT.box(LT.name).split(' ').map(Number), wh = h * 0.56, ws = wh / vb[3], ww = vb[2] * ws, wy = y + h / 2 - (-10 - vb[1]) * ws;
  const w = h * 1.22 + ww, pad = 12;
  return `<rect x="${x - pad}" y="${y - pad}" width="${(w + 2 * pad + 4).toFixed(1)}" height="${h + 2 * pad}" rx="${(h / 2 + pad).toFixed(1)}" fill="${bg}"/>` +
    G.svg({ texture: true, id: 'mk', attrs: ` x="${x}" y="${y}" width="${h}" height="${h}" color="${fg}"` }) +
    `<svg x="${(x + h * 1.22).toFixed(2)}" y="${wy.toFixed(2)}" width="${ww.toFixed(2)}" height="${wh.toFixed(2)}" viewBox="${vb.join(' ')}" color="${fg}">${LT.ink(LT.name)}${LT.pupils.replace(/ class="pupil" data-ex="[^"]*" data-ey="[^"]*" data-m="[^"]*"/g, '')}</svg>`;
}

function build(mode) {
  const { bg, fg } = S.theme(mode);
  const nm = nameLayout(), pts = spiral(nm.box);
  const thin = byWidth(pts, 2, 0.1, () => true);
  const thick = byWidth(pts, 3, 0.2, (p) => p[3] > 0);
  const lines = (groups) => groups.map(([w, pl]) => `<path d="${S.pathData(pl)}" stroke-width="${w.toFixed(1)}"/>`).join('');

  // the cliff, its outline sampled every 1.5 px
  const top = []; for (let x = 0; x <= W + 0.1; x += 1.5) top.push([x, cliffTop(x)]);
  const cliff = 'M0 ' + H + 'L' + top.map(([x, y]) => S.r1(x) + ' ' + S.r1(y)).join('L') + 'L' + W + ' ' + H + 'Z';
  const fx = W * (TIP + 0.012), fy = cliffTop(fx), fsize = H * 0.07 * 1.07;

  // the identity on the rock: "Title:" in the data face, the title in the display face
  const tx = W * TIP + 46 * s, ty = H * TOP + 44 * s;
  const T = F.glyphs();
  const ident = `<g fill="${bg}">${T.use('data', 'Title:', tx, ty + 12, 12.5, { ls: 0.02 })}${T.use('title', 'AI Solutions Engineer', tx, ty + 44, 27)}</g>`;

  const body =
    `<g fill="none" stroke="${fg}" stroke-linecap="round" stroke-linejoin="round">${lines(thin)}</g>` +
    `<mask id="nm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><path d="${nm.n1}" fill="#fff" stroke="#fff" stroke-width="${(nm.size * 0.022).toFixed(2)}" stroke-linejoin="round"/></mask>` +
    `<g mask="url(#nm)" fill="none" stroke="${fg}" stroke-linecap="butt">${lines(thick)}</g>` +
    `<path d="${nm.n2}" fill="${bg}" stroke="${fg}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="${cliff}" fill="${fg}"/>` + figure(fx, fy, fsize, fg) + `<defs>${T.defs()}</defs>` + ident +
    lockup(PAD, 30, 30, fg, bg);
  return S.panel({
    w: W, h: H, bg, corners: 'top',
    title: 'Sahil Tomar (dev-S-t), AI Solutions Engineer',
    desc: 'The name Sahil Tomar drawn by the lines of a spiral tunnel, the handle dev-S-t cut out of them, and a stick figure standing on a cliff edge above the title AI Solutions Engineer. The human-in-loop.dev mark sits in the top left.',
    body
  });
}

module.exports = { build, W, H };
