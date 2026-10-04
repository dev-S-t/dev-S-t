// Case studies: a heading, then one strip per study, each its own image so each can link to its page on
// human-in-loop.dev. The strips are windows onto one tall contour field, so the terrain runs on from strip to
// strip, and every plate is a peak the lines ring (the site's case studies section). Plates step left and right
// like the site's staggered map.
const F = require('../lib/fonts.cjs'), N = require('../lib/noise.cjs'), S = require('../lib/svg.cjs'), TR = require('../lib/terrain.cjs');

const W = 900;
// [title, subtitle, page] as the site lists them
const STUDIES = [
  ["Data That Can't Leave the Building", '(Privacy-First On-Prem RAG over A2A protocol)', 'on-prem-privacy-rag'],
  ['Multi-Tenant AI Without Cross-Contamination', '(AnyAssist on Google ADK & LiteLLM)', 'multi-tenant-isolation'],
  ['30 Minutes to Under a Minute — Automating a Manual Dispatch Desk', '(Dubai Luxury Transport Client)', 'manual-dispatch-automation'],
  ['Filtering Signal From a Thousand Messages a Day', '(Independent Musician Community Gateway)', 'message-filtering'],
  ['Unblocking a Real-Time Avatar Product After Months Stuck', '(Hireups / MGS Technology via Quantashift)', 'avatar-product-rescue'],
  ['One Voice Platform, Two Opposite Conversational Goals', '(VOAG Multi-Provider & Regional Workers)', 'one-platform-two-goals'],
  ['Consistent Brand Content Without a Social Media Manager', '(MAGe Multi-Agent Ad Engine)', 'brand-content-without-a-manager']
];
const STEP = [64, 196, 104, 236, 40, 168, 120];    // how far right each plate sits
const TS = 27, SS = 15.5, NS = 58, PADX = 26, PADY = 20, GAPN = 20, M = 16;
// motion: rings ripple out from each plate in turn, so a pulse runs down the list
const CSS = '.pg{opacity:0;animation:pg 9s ease-out infinite}@keyframes pg{0%{opacity:0}5%{opacity:.8}20%{opacity:0}100%{opacity:0}}' + S.CALM;
const pings = (p, i, fg) => `<g fill="none" stroke="${fg}" stroke-width="1.1">` + [5, 10, 15].map((o, k) => `<rect class="pg" style="animation-delay:${(i * 0.9 + k * 0.35).toFixed(2)}s" x="${(p.x - o).toFixed(1)}" y="${(p.y - o).toFixed(1)}" width="${(p.w + 2 * o).toFixed(1)}" height="${(p.h + 2 * o).toFixed(1)}" rx="${p.r + o}"/>`).join('') + '</g>';

function plan() {
  const items = []; let y = 0;
  const head = { h: 140 + S.TEAR, plate: { x: 26, y: 24 + S.TEAR, w: 0, h: 92, r: 22 } };
  head.plate.w = 28 + F.width('head', 'Case Studies', 60, -0.012) + 28;
  head.top = 0; y = head.h;
  STUDIES.forEach(([title, sub, slug], i) => {
    const numW = F.width('num', String(i + 1), NS);
    const maxW = Math.min(620, W - STEP[i] - 2 * PADX - numW - GAPN - 30);
    const lines = F.wrap('link', title, TS, maxW), subs = F.wrap('text', sub, SS, maxW);
    const textW = Math.max(...lines.map((l) => F.width('link', l, TS)), ...subs.map((l) => F.width('text', l, SS)));
    const ph = PADY * 2 + TS * 0.8 + (lines.length - 1) * TS * 1.16 + 9 + SS * 1.15 + (subs.length - 1) * SS * 1.4 + SS * 0.3;
    const pw = PADX * 2 + numW + GAPN + textW;
    const x = Math.min(STEP[i], W - pw - 26);
    const h = ph + 2 * M;
    items.push({ i, title, sub, slug, lines, subs, numW, top: y, h, plate: { x, y: y + M, w: pw, h: ph, r: 22 } });
    y += h;
  });
  items[items.length - 1].h += S.TEAR; y += S.TEAR;   // the last strip holds the tear into the footer
  return { head, items, total: y };
}

async function files() {
  const P = plan();
  const plates = [P.head.plate, ...P.items.map((it) => it.plate)];
  const peaks = plates.map((b) => ({ box: b, lift: 0.42, reach: 48 }));
  const field = (x, y) => 0.9 * N.fbm(x / 300 + 3.3, y / 300 - 1.7, 1.2);
  const width = (k, x, y) => (k % 4 === 0 ? 1.3 : 0.7) * N.mix(0.7, 1.35, N.smoothstep(-0.5, 0.6, N.sn(x / 280, y / 280 + 4)));
  const out = {};

  const strip = (mode, top, h, plate, fill) => {
    const { bg, fg } = S.theme(mode), T = F.glyphs();
    const near = peaks.filter((p) => p.box.y < top + h + 160 && p.box.y + p.box.h > top - 160);
    const lines = TR.draw({ w: W, h, x0: 0, y0: top, f: field, peaks: near, step: 0.085, width, cell: 5 });
    const content = fill(T, plate, fg);
    return { bg, fg, body: `<g transform="translate(0 ${-top})"><g fill="none" stroke="${fg}" stroke-linecap="round" stroke-linejoin="round">${lines}</g>` +
      `<rect x="${plate.x.toFixed(1)}" y="${plate.y.toFixed(1)}" width="${plate.w.toFixed(1)}" height="${plate.h.toFixed(1)}" rx="${plate.r}" fill="${bg}"/>` +
      `<defs>${T.defs()}</defs><g fill="${fg}">${content}</g></g>` };
  };

  for (const mode of ['light', 'dark']) {
    const hd = strip(mode, 0, P.head.h, P.head.plate, (T, p, fg) => T.use('head', 'Case Studies', p.x + 28, p.y + 66, 60, { ls: -0.012 }) + pings(p, 0, fg));
    out['cases-light'.replace('light', mode)] = S.panel({ w: W, h: P.head.h, bg: hd.bg, title: 'Case Studies', desc: 'The heading of the case studies, on a contour map. Links to human-in-loop.dev/case-studies/.', body: hd.body + S.tearIn(W, 14, hd.fg, 2.9), style: CSS });
    for (const it of P.items) {
      const st = strip(mode, it.top, it.h, it.plate, (T, p, fg) => {
        let s = T.use('num', String(it.i + 1), p.x + PADX - 2, p.y + PADY + NS * 0.74, NS);
        // baselines: the title's lines, underlined like the site's links, then the subtitle
        const tx = p.x + PADX + it.numW + GAPN; let ty = p.y + PADY + TS * 0.8;
        it.lines.forEach((l, k) => { if (k) ty += TS * 1.16; s += T.use('link', l, tx, ty, TS) + `<rect x="${tx.toFixed(1)}" y="${(ty + 4.5).toFixed(1)}" width="${F.width('link', l, TS).toFixed(1)}" height="1.2"/>`; });
        ty += 9 + SS * 1.15;
        it.subs.forEach((l, k) => { if (k) ty += SS * 1.4; s += T.use('text', l, tx, ty, SS); });
        return s + pings(p, it.i + 1, fg);
      });
      const last = it.i === P.items.length - 1;
      out[`case-${it.i + 1}-${mode}`] = S.panel({ w: W, h: Math.round(it.h), bg: st.bg, style: CSS, title: `Case Study ${it.i + 1}: ${it.title} ${it.sub}`, desc: `Links to human-in-loop.dev/case-studies/${it.slug}/.`, body: st.body + (last ? S.tearOut(W, Math.round(it.h), 18, st.fg, 6.1) : '') });
    }
  }
  return out;
}

module.exports = { files, STUDIES };
