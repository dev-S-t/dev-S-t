// Contact: the site's footer at night. A moon with rings sets on the horizon, the address stands as a barcode
// (Libre Barcode 128, as on the site) with its reflection broken up by the water, and the stars twinkle. It is a
// night scene in both themes, like the site's footer. Below it, one pill per way to reach Sahil, each its own
// image so each can link.
const F = require('../lib/fonts.cjs'), N = require('../lib/noise.cjs'), S = require('../lib/svg.cjs'), IC = require('../lib/icons.cjs');

const W = 900, H = 330, HZ = 196;
const MOON = { x: 58, y: 134, r: 60 };
const { PAPER, INK } = S;

// Code 128 (set B): start, the text, its check character, stop; in Libre Barcode 128, value v is character v + 32
// and values from 95 up are characters from 195
function code128(txt) {
  let sum = 104;
  [...txt].forEach((c, i) => { sum += (i + 1) * (c.charCodeAt(0) - 32); });
  const v = sum % 103, ch = (x) => String.fromCharCode(x < 95 ? x + 32 : x + 100);
  return 'Ì' + txt + ch(v) + 'Î';
}

function scene() {
  const T = F.glyphs();
  const css = `.tw{animation:tw 4.3s ease-in-out infinite alternate}.tw.b{animation-duration:3.1s;animation-delay:-1.2s}.tw.c{animation-duration:5.7s;animation-delay:-2.9s}` +
    `@keyframes tw{from{opacity:.25}to{opacity:1}}.sh{animation:sh 3.4s ease-in-out infinite alternate}@keyframes sh{from{transform:translateX(-2.5px)}to{transform:translateX(2.5px)}}` +
    `@media (prefers-reduced-motion:reduce){.tw,.sh{animation:none}}`;

  // stars: one in about a third of the cells of a 27 px grid, never on the moon or the water
  const stars = [[], [], []];
  for (let cy = 0; cy < HZ; cy += 27) for (let cx = 0; cx < W; cx += 27) {
    const h = N.hash(cx * 0.37, cy * 0.53); if (h < 0.7) continue;
    const x = cx + 27 * N.hash(cx + 3.1, cy), y = cy + 27 * N.hash(cx, cy + 7.7), r = 0.6 + 1.1 * Math.pow(N.hash(cx + 1.9, cy + 1.9), 6);
    if (y > HZ - 8 || Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 6) continue;
    stars[Math.floor(N.hash(cx + 5, cy + 5) * 3)].push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`);
  }
  // the moon's rings, cut off at the horizon
  let rings = '';
  for (let k = 0, r = MOON.r + 12; r < MOON.r * 2.45; k++, r += 3.6) rings += `<circle cx="${MOON.x}" cy="${MOON.y}" r="${r.toFixed(1)}" stroke-opacity="${(0.9 - 0.6 * k / 24).toFixed(2)}"/>`;

  // the barcode: about a third of the width, its right edge near the page margin
  const bars = code128('human-in-loop.dev');
  const bs = 64, bw = F.width('code', bars, bs), bx = W - 34 - bw;
  const bbox = F.bbox('code', bars, bx, 0, bs);
  const by = HZ - 30 - bbox.y2;          // bars stop 30 px above the horizon
  const barsD = F.text('code', bars, bx, by, bs, { dp: 1 });
  const label = T.use('data', 'human-in-loop.dev', bx + bw / 2, HZ - 12, 11.5, { ls: 0.3, anchor: 'middle' });

  // the water: lines that spread out as they come closer, rocking a little; under the moon they catch the light
  let water = '', glint = '';
  for (let k = 0; ; k++) {
    const y = HZ + 3 + 1.18 * Math.pow(k, 1.52); if (y > H + 4) break;
    const amp = 0.3 + 0.17 * k, wl = 70 + 9 * k, pts = [];
    for (let x = -10; x <= W + 10; x += 6) pts.push([x, y + amp * N.sn(x / wl, k * 1.37) + 0.4 * amp * N.sn(x / (wl * 0.37), k * 2.1 + 4)]);
    water += `<path d="${S.pathData([pts])}" stroke-width="${(0.45 + 0.05 * k).toFixed(2)}" stroke-opacity="${(0.5 + 0.35 * N.hash(k, 3)).toFixed(2)}"/>`;
    // the moon's glitter: short bright strokes under it, longer and heavier nearer the viewer
    const span = MOON.r * (0.7 + 0.03 * k), j0 = MOON.x - span + 20 * N.sn(k * 0.9, 1), j1 = MOON.x + span + 24 * N.sn(k * 0.7, 2);
    const seg = pts.filter(([x]) => x > j0 && x < j1);
    if (seg.length > 1) glint += `<path class="sh" style="animation-delay:${(-0.37 * k).toFixed(2)}s" d="${S.pathData([seg])}" stroke-width="${(1.2 + 0.11 * k).toFixed(2)}"/>`;
  }
  // the barcode's reflection: the bars upside down, in thin slices that the water pushes sideways
  let clips = '', refl = '';
  // the bars stand 30 px above the horizon, so their mirror image starts 30 px below it
  const r0 = 2 * HZ - 6 - (by + bbox.y2), barH = bbox.y2 - bbox.y1;
  for (let j = 0; j < 8; j++) {
    const y0 = r0 + j * barH / 8, h = barH / 8 - 1.6 - j * 0.12;
    clips += `<clipPath id="rs${j}"><rect x="0" y="${y0.toFixed(1)}" width="${W}" height="${h.toFixed(1)}"/></clipPath>`;
    refl += `<g clip-path="url(#rs${j})" opacity="${(0.95 - j * 0.08).toFixed(2)}"><g class="sh" style="animation-delay:${(-0.6 * j).toFixed(1)}s"><use href="#bars" transform="translate(${((2 + j) * N.sn(j * 1.7, 0.3)).toFixed(1)} ${(2 * HZ - 6).toFixed(1)}) scale(1 -1)"/></g></g>`;
  }

  // the heading on the water, on a plate of the night's own colour
  const hs = 50, hw = F.width('head', 'Contact', hs, -0.012), plate = { x: 26, y: H - 100, w: hw + 56, h: 76 };
  const heading = T.use('head', 'Contact', plate.x + 28, plate.y + 54, hs, { ls: -0.012 });
  const body =
    `<defs><clipPath id="sky"><rect width="${W}" height="${HZ}"/></clipPath><path id="bars" d="${barsD}"/>${clips}</defs>` +
    `<g fill="${PAPER}">${stars.map((g, i) => `<g class="tw ${['a', 'b', 'c'][i]}">${g.join('')}</g>`).join('')}</g>` +
    `<g fill="none" stroke="${PAPER}" stroke-width="0.8" clip-path="url(#sky)">${rings}</g>` +
    `<circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="${PAPER}" clip-path="url(#sky)"/>` +
    `<use href="#bars" fill="${PAPER}"/><g fill="${PAPER}">${refl}</g>` +
    `<path d="M0 ${HZ}H${W}" stroke="${PAPER}" stroke-width="1.3"/>` +
    `<g fill="none" stroke="${PAPER}" stroke-linecap="round">${water}${glint}</g>` +
    `<rect x="${plate.x}" y="${plate.y}" width="${plate.w.toFixed(1)}" height="${plate.h}" rx="22" fill="${INK}"/>` +
    `<defs>${T.defs()}</defs><g fill="${PAPER}">${label}${heading}</g>`;
  return S.panel({ w: W, h: H, bg: INK, title: 'Contact', style: css,
    desc: 'A night sea: a moon with rings setting on the horizon, stars, and the address human-in-loop.dev written as a barcode with its reflection in the water. Links to human-in-loop.dev/contact/.', body });
}

// a pill: a mark drawn in lines, the label in the data face, the link in the text face, underlined
async function pill(slug, label, value) {
  const T = F.glyphs(), w = 268, h = 62;
  const icon = slug === 'hil' ? null : await IC.load(slug);
  const mk = icon ? IC.mark(icon, 36, h / 2, 26, 26, PAPER, 11) : '';
  const vw = F.width('text', value, 15);
  const text = `<g fill="${PAPER}">${T.use('data', label, 62, 26, 11.5, { ls: 0.02 })}${T.use('text', value, 62, 46, 15)}<rect x="62" y="49.5" width="${vw.toFixed(1)}" height="1"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${S.esc(label + ' ' + value)}">` +
    `<rect width="${w}" height="${h}" rx="${h / 2}" fill="${INK}"/><defs>${T.defs()}</defs>${mk}${text}</svg>\n`;
}

const PILLS = [
  ['linkedin', 'LinkedIn:', 'dev-s-t', 'https://www.linkedin.com/in/dev-s-t/'],
  ['whatsapp', 'Primary WhatsApp:', 'wa.link/r8csgy', 'https://wa.link/r8csgy'],
  ['orcid', 'ORCID:', '0009-0005-9222-9121', 'https://orcid.org/0009-0005-9222-9121']
];

async function files() {
  const out = { contact: scene() };
  for (const [slug, label, value] of PILLS) out['pill-' + slug] = await pill(slug, label, value);
  return out;
}

module.exports = { files, PILLS, code128 };
