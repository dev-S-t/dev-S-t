// Skills: the marks of the tools Sahil works with, each standing on its own rise in a contour field (the site's
// skills section is contours with its plates as peaks). Every mark is drawn in lines, labelled in the data face.
const F = require('../lib/fonts.cjs'), N = require('../lib/noise.cjs'), S = require('../lib/svg.cjs');
const TR = require('../lib/terrain.cjs'), IC = require('../lib/icons.cjs');

const W = 900, H = 360;
// slug on the site (Simple Icons) -> label
const TOOLS = [
  ['python', 'Python'], ['go', 'Go'], ['javascript', 'JavaScript'], ['nextdotjs', 'Next.js'], ['fastapi', 'FastAPI'],
  ['livekit', 'LiveKit'], ['webrtc', 'WebRTC'], ['googlegemini', 'Gemini'], ['google', 'Google ADK'], ['langgraph', 'LangGraph'],
  ['modelcontextprotocol', 'MCP'], ['qdrant', 'Qdrant'], ['redis', 'Redis'], ['googlecloud', 'Google Cloud'], ['docker', 'Docker'],
  ['githubactions', 'GitHub Actions'], ['git', 'Git'], ['nginx', 'Nginx'], ['digitalocean', 'DigitalOcean'], ['playwright', 'Playwright']
];

async function files() {
  const icons = await Promise.all(TOOLS.map(([slug]) => IC.load(slug)));
  // places: three loose rows, each offset from the last, the first row leaving room for the heading
  const rows = [{ y: 72, x0: 340, x1: 836, n: 6 }, { y: 178, x0: 66, x1: 806, n: 7 }, { y: 284, x0: 112, x1: 840, n: 7 }];
  const spots = []; let t = 0;
  for (const r of rows) for (let i = 0; i < r.n; i++, t++) {
    const x = r.x0 + (r.x1 - r.x0) * (i / (r.n - 1)) + 9 * N.sn(t * 1.7, 3.1), y = r.y + 7 * N.sn(t * 2.3, 8.4);
    spots.push({ x, y, tool: TOOLS[t], icon: icons[t] });
  }
  const head = { x: 26, y: 24, w: 250, h: 92, r: 22 };
  const peaks = [{ box: head, lift: 0.55, reach: 60, clear: 0 }, ...spots.map((p) => ({ box: { x: p.x - 46, y: p.y - 34, w: 92, h: 78, r: 30 }, lift: 0.45, reach: 34, clear: 0 }))];
  const field = (x, y) => 0.75 * N.fbm(x / 340, y / 340, 2.1);
  const width = (k, x, y) => (k % 4 === 0 ? 1.35 : 0.7) * N.mix(0.75, 1.3, N.smoothstep(-0.5, 0.6, N.sn(x / 300, y / 300)));

  const build = (mode) => {
    const { bg, fg } = S.theme(mode);
    const lines = TR.draw({ w: W, h: H, f: field, peaks, step: 0.085, width, cell: 4.5 });
    const marks = spots.map((p) => IC.mark(p.icon, p.x, p.y - 8, 54, 40, fg)).join('');
    const T = F.glyphs();
    const labels = spots.map((p) => T.use('data', p.tool[1], p.x, p.y + 30, 12, { anchor: 'middle', ls: 0.02 })).join('');
    const body = `<g fill="none" stroke="${fg}" stroke-linecap="round" stroke-linejoin="round">${lines}</g>` +
      `<rect x="${head.x}" y="${head.y}" width="${head.w}" height="${head.h}" rx="${head.r}" fill="${bg}"/>` +
      `<path fill="${fg}" d="${F.text('head', 'Skills', head.x + 28, head.y + 66, 60, { ls: -0.012 })}"/>` +
      marks + `<defs>${T.defs()}</defs><g fill="${fg}">${labels}</g>`;
    return S.panel({ w: W, h: H, bg, title: 'Skills', desc: 'Marks of the tools Sahil Tomar works with, drawn in lines on a contour map: ' + TOOLS.map((t) => t[1]).join(', ') + '.', body });
  };
  return { 'skills-light': build('light'), 'skills-dark': build('dark') };
}

module.exports = { files };
