// The site's fonts, turned into outlines. GitHub shows README images without loading any font, so every word in
// the images is drawn as a path. Each face is fetched once from Google Fonts as a static instance (an old
// User-Agent gets plain TTF files) and kept in scripts/.fonts.
const fs = require('fs'), path = require('path'), opentype = require('opentype.js');
const DIR = path.join(__dirname, '..', '.fonts');

// name: [family, axes] as the Google Fonts css2 API takes them
const FACES = {
  name: ['Kalnia', 'wdth,wght@125,700'],    // the hero name (.n1, .n2)
  head: ['Kalnia', 'wght@400'],             // section headings (h2: 405, the nearest instance served)
  title: ['Kalnia', 'wght@500'],            // the hero title line (460)
  link: ['Kalnia', 'wght@500'],             // case study titles (520)
  data: ['Workbench', ''],                  // labels (strong)
  text: ['Geologica', 'wght@400'],          // running text
  num: ['Monoton', ''],                     // numerals
  code: ['Libre Barcode 128', '']           // the barcode in the footer
};

const loaded = {};
async function load(key) {
  if (loaded[key]) return loaded[key];
  const [family, axes] = FACES[key];
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, key + '.ttf');
  if (!fs.existsSync(file)) {
    const q = 'https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + (axes ? ':' + axes : '');
    const css = await (await fetch(q, { headers: { 'User-Agent': 'Mozilla/4.0' } })).text();
    const m = css.match(/url\((https:[^)]+?\.ttf)\)/);
    if (!m) throw new Error('no TTF for ' + key + ': ' + css.slice(0, 200));
    const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
    fs.writeFileSync(file, buf);
  }
  const b = fs.readFileSync(file);
  loaded[key] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return loaded[key];
}
const loadAll = () => Promise.all(Object.keys(FACES).map(load));

// lay out one line: glyph positions with kerning and letter-spacing (in em, like CSS)
function layout(key, str, size, ls = 0) {
  const font = loaded[key]; if (!font) throw new Error('font not loaded: ' + key);
  const k = size / font.unitsPerEm, glyphs = font.stringToGlyphs(str);
  let x = 0; const out = [];
  glyphs.forEach((g, i) => {
    out.push({ g, x });
    x += g.advanceWidth * k + ls * size;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * k;
  });
  return { glyphs: out, width: x - ls * size, k, font };
}
const width = (key, str, size, ls = 0) => layout(key, str, size, ls).width;

// the outline of one line of text as path data; anchor 'start' | 'middle' | 'end'
function text(key, str, x, y, size, { ls = 0, anchor = 'start', dp = 2 } = {}) {
  const L = layout(key, str, size, ls);
  const x0 = anchor === 'middle' ? x - L.width / 2 : anchor === 'end' ? x - L.width : x;
  return L.glyphs.map(({ g, x: gx }) => g.getPath(x0 + gx, y, size).toPathData(dp)).join('');
}
// the ink box of a line of text (for placing things against the letters themselves)
function bbox(key, str, x, y, size, opts = {}) {
  const L = layout(key, str, size, opts.ls || 0);
  const x0 = opts.anchor === 'middle' ? x - L.width / 2 : opts.anchor === 'end' ? x - L.width : x;
  let b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  L.glyphs.forEach(({ g, x: gx }) => { const bb = g.getPath(x0 + gx, y, size).getBoundingBox(); if (bb.x1 < bb.x2) { b.x1 = Math.min(b.x1, bb.x1); b.y1 = Math.min(b.y1, bb.y1); b.x2 = Math.max(b.x2, bb.x2); b.y2 = Math.max(b.y2, bb.y2); } });
  return b;
}
// greedy wrap to a width
function wrap(key, str, size, maxW, ls = 0) {
  const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && width(key, t, size, ls) > maxW) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

// a glyph's outline in font units with short relative commands (Workbench's letters are hundreds of tiny blocks)
function compact(cmds) {
  let d = '', x = 0, y = 0, sx = 0, sy = 0;
  const n = (v) => { const r = Math.round(v); return (r < 0 ? '' : ' ') + r; };
  for (const c of cmds) {
    if (c.type === 'M') { d += 'M' + n(c.x).trim() + n(c.y); x = sx = Math.round(c.x); y = sy = Math.round(c.y); continue; }
    if (c.type === 'Z') { d += 'z'; x = sx; y = sy; continue; }
    const X = Math.round(c.x), Y = Math.round(c.y);
    if (c.type === 'L') { if (Y === y) d += 'h' + n(X - x).trim(); else if (X === x) d += 'v' + n(Y - y).trim(); else d += 'l' + n(X - x).trim() + n(Y - y); }
    else if (c.type === 'Q') d += 'q' + n(c.x1 - x).trim() + n(c.y1 - y) + n(X - x) + n(Y - y);
    else if (c.type === 'C') d += 'c' + n(c.x1 - x).trim() + n(c.y1 - y) + n(c.x2 - x) + n(c.y2 - y) + n(X - x) + n(Y - y);
    x = X; y = Y;
  }
  return d;
}
// Text for one image: each letter's outline is stored once in <defs> and placed with <use>, so a label set in the
// same face many times costs little. use() returns the placed letters; defs() the shapes, for the image's <defs>.
function glyphs() {
  const shapes = new Map();
  return {
    use(key, str, x, y, size, { ls = 0, anchor = 'start' } = {}) {
      const L = layout(key, str, size, ls), upm = L.font.unitsPerEm;
      const x0 = anchor === 'middle' ? x - L.width / 2 : anchor === 'end' ? x - L.width : x;
      return L.glyphs.map(({ g, x: gx }) => {
        if (!g.path || !g.path.commands || !g.path.commands.length) return '';
        const id = key + g.index;
        if (!shapes.has(id)) shapes.set(id, compact(g.getPath(0, 0, upm).commands));
        return `<use href="#${id}" transform="translate(${(x0 + gx).toFixed(2)} ${y.toFixed(2)}) scale(${(size / upm).toFixed(5)})"/>`;
      }).join('');
    },
    defs: () => [...shapes].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('')
  };
}

module.exports = { load, loadAll, layout, width, text, bbox, wrap, glyphs, compact, FACES };
