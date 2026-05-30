import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/renderer/assets/fonts');
const modulesDir = join(root, 'node_modules/@fontsource');

/** Maps diagram font label → fontsource package folder name. */
const FONT_PACKAGES = {
  'Noto Sans': 'noto-sans',
  Roboto: 'roboto',
  'Open Sans': 'open-sans',
  Lato: 'lato',
  Inter: 'inter',
  Montserrat: 'montserrat',
  Poppins: 'poppins',
  'Source Sans 3': 'source-sans-3',
  Raleway: 'raleway',
  Oswald: 'oswald',
};

/** Maps diagram font label → vendored filename prefix. */
const FILE_PREFIX = {
  'Noto Sans': 'NotoSans',
  Roboto: 'Roboto',
  'Open Sans': 'OpenSans',
  Lato: 'Lato',
  Inter: 'Inter',
  Montserrat: 'Montserrat',
  Poppins: 'Poppins',
  'Source Sans 3': 'SourceSans3',
  Raleway: 'Raleway',
  Oswald: 'Oswald',
};

function findFontFile(filesDir, packageName, weights) {
  for (const weight of weights) {
    const suffix = `${weight}-normal.woff`;
    const preferred = `${packageName}-latin-${suffix}`;
    const preferredPath = join(filesDir, preferred);
    if (existsSync(preferredPath)) {
      return preferredPath;
    }

    const match = readdirSync(filesDir).find(
      (name) => name.endsWith(suffix) && name.includes('latin') && !name.includes('latin-ext'),
    );
    if (match) {
      return join(filesDir, match);
    }
  }

  throw new Error(`Missing latin woff for ${packageName} (weights ${weights.join(', ')}) in ${filesDir}`);
}

mkdirSync(outDir, { recursive: true });

for (const [label, packageName] of Object.entries(FONT_PACKAGES)) {
  const filesDir = join(modulesDir, packageName, 'files');
  if (!existsSync(filesDir)) {
    throw new Error(`@fontsource/${packageName} is not installed — run bun install`);
  }

  const prefix = FILE_PREFIX[label];
  copyFileSync(findFontFile(filesDir, packageName, [400]), join(outDir, `${prefix}-Regular.woff`));
  copyFileSync(findFontFile(filesDir, packageName, [600, 700]), join(outDir, `${prefix}-SemiBold.woff`));
}

console.log(`Synced ${Object.keys(FONT_PACKAGES).length} diagram fonts to ${outDir}`);
