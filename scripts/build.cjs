// Builds the images for the github.com/dev-S-t profile README, in the look of human-in-loop.dev.
// usage: node scripts/build.cjs            every image
//        node scripts/build.cjs activity   only the activity panel (the daily GitHub Action runs this)
// Each image is written twice, -light and -dark; the README picks one by the viewer's GitHub theme.
const fs = require('fs'), path = require('path');
const F = require('./lib/fonts.cjs');
const OUT = path.join(__dirname, '..', 'assets');

const PANELS = {
  hero: () => require('./panels/hero.cjs'),
  skills: () => require('./panels/skills.cjs'),
  activity: () => require('./panels/activity.cjs'),
  cases: () => require('./panels/cases.cjs'),
  contact: () => require('./panels/contact.cjs')
};

(async () => {
  const only = process.argv.slice(2);
  await F.loadAll();
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, mod] of Object.entries(PANELS)) {
    if (only.length && !only.includes(name)) continue;
    const m = mod();
    const files = m.files ? await m.files() : { [name + '-light']: m.build('light'), [name + '-dark']: m.build('dark') };
    for (const [file, svg] of Object.entries(await files)) {
      fs.writeFileSync(path.join(OUT, file + '.svg'), svg);
      console.log(file + '.svg', (Buffer.byteLength(svg) / 1024).toFixed(0) + ' KB');
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
