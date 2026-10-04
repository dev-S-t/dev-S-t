// The site's lettering: "human-in-loop" for the nav and "menu" for the menu button, as symbols in
// assets/img/wordmark.svg. An even line with flat ends: every stem stops exactly on the baseline, the x-height, the
// ascender or the descender, and round letters overshoot those lines by a hair so they look level with the stems.
// The two o's of loop are eyes; their pupils stay in each page so the page can move them.
// Copied from human-in-loop.dev (tools/logo/lettering.cjs). This copy writes nothing: it hands back the drawn words.
const fs = require('fs'), path = require('path');
const f = (v) => (Math.round(v * 100) / 100).toString();

// units: baseline 0, x-height -20, ascender -31, descender 10.5
const W = 4.2, OS = 0.35;                       // stroke, overshoot of round letters
const XH = -20, AS = -31, DS = 10.5, MID = -10;
const R = (-XH + 2 * OS) / 2 - W / 2;           // centreline radius of a bowl, so its ink runs from -20.35 to 0.35
const GAP = 3.6, SPACE = 11;
// closed bowls (o, a, p, e) look smaller than the arches of n and u at the same height, as circles do beside straight
// stems, so they reach a little further past both lines and are drawn a touch wider than tall
const BOS = 0.9, RB = (-XH + 2 * BOS) / 2 - W / 2, RBX = RB * 1.04;
const arc = (cx, cy, rx, ry, a0, a1, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const bowl = (cx) => arc(cx, MID, RBX, RB, -90, 270, 72);
const stem = (x, top, bot) => [[x, top], [x, bot]];
const RM = 6.7;                                 // m's narrower arches keep n's height (they are half-ellipses)

const glyphs = {
  h: { w: 2 * R, s: [stem(0, AS, 0), [...arc(R, MID, R, R, 180, 360), [2 * R, 0]]] },
  n: { w: 2 * R, s: [stem(0, XH, 0), [...arc(R, MID, R, R, 180, 360), [2 * R, 0]]] },
  m: { w: 4 * RM, s: [stem(0, XH, 0), [...arc(RM, MID, RM, R, 180, 360), [2 * RM, 0]], [[2 * RM, MID], ...arc(3 * RM, MID, RM, R, 180, 360), [4 * RM, 0]]] },
  u: { w: 2 * R, s: [[[0, XH], ...arc(R, MID, R, R, 180, 0)], stem(2 * R, XH, 0)] },
  a: { w: 2 * RBX, s: [bowl(RBX), stem(2 * RBX, XH, 0)] },
  i: { w: 0, s: [stem(0, XH, 0)], d: [[0, -26.6, W * 0.62]] },
  l: { w: 0, s: [stem(0, AS, 0)] },
  o: { w: 2 * RBX, s: [bowl(RBX)], eye: [RBX, MID] },
  p: { w: 2 * RBX, s: [stem(0, XH, DS), bowl(RBX)] },
  e: { w: 2 * RBX, s: [[[0, MID], [2 * RBX, MID], ...arc(RBX, MID, RBX, RB, 0, -322, 64).slice(1)]] },
  '-': { w: 6.4, s: [stem(0, MID, MID).map(([x, y], i) => [i * 6.4, y])] }
};

function layout(text) {
  let x = 0, end = 0; const strokes = [], dots = [], eyes = [];
  text.split(' ').forEach((word) => {
    [...word].forEach((ch) => {
      const g = glyphs[ch]; if (!g) throw new Error('no glyph ' + ch);
      g.s.forEach((pl) => strokes.push(pl.map(([px, py]) => [px + x, py])));
      (g.d || []).forEach(([px, py, r]) => dots.push([px + x, py, r]));
      if (g.eye && word.includes('loop')) eyes.push([g.eye[0] + x, g.eye[1]]);
      end = x + g.w; x += g.w + W + GAP;
    });
    x += SPACE - GAP;
  });
  return { strokes, dots, eyes, width: end };
}
const pathOf = (pl) => 'M' + pl.map(([x, y]) => f(x) + ' ' + f(y)).join('L');
// every word shares one vertical box, so any two of them line up when set at the same height
const box = (L, pad = 0) => [-W / 2 - pad, AS - 0.6, L.width + W + 2 * pad, DS - AS + 1.2].map(f).join(' ');
const ink = (L) => `<path d="${L.strokes.map(pathOf).join('')}" fill="none" stroke="currentColor" stroke-width="${W}" stroke-linecap="butt" stroke-linejoin="round"/>` + L.dots.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="currentColor"/>`).join('');

const name = layout('human-in-loop'), menu = layout('menu');
const PR = 2.5, LOOK = [1.3, 0], TRAVEL = RB - W / 2 - PR - 0.4;
const pupils = name.eyes.map(([x, y]) => `<circle class="pupil" data-ex="${f(x)}" data-ey="${f(y)}" data-m="${f(TRAVEL)}" cx="${f(x + LOOK[0])}" cy="${f(y + LOOK[1])}" r="${PR}" fill="currentColor"/>`).join('');
// the menu icon: three lines of the same weight on the x-height, the middle one shorter (it folds away when open)
const ICON = 18, icon = `<g class="mt-icon" stroke="currentColor" stroke-width="${W}" stroke-linecap="butt" fill="none"><path d="M0 -17.9H${ICON}M0 -2.1H${ICON}"/><path class="mt-mid" d="M0 -10H${ICON * 0.66}"/></g>`;
const menuX = ICON + 12;
module.exports = { layout, glyphs, W, box, ink, name, menu, pupils, icon, menuX };
