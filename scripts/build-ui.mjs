import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const uiDir = path.join(rootDir, 'src', 'ui');
const distDir = path.join(rootDir, 'dist');
const outHtmlPath = path.join(distDir, 'office-app.html');

async function build() {
  const indexHtml = fs.readFileSync(path.join(uiDir, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(uiDir, 'style.css'), 'utf8');

  const bundled = await esbuild.build({
    entryPoints: [path.join(uiDir, 'app.js')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
  });

  const jsCode = bundled.outputFiles[0].text;
  const atlasPngPath = path.join(rootDir, 'assets', 'tilesets', 'office-atlas-16x16.png');
  const atlasMapPath = path.join(rootDir, 'assets', 'tilesets', 'atlas-map.json');
  let atlasBootCode = '';
  if (fs.existsSync(atlasPngPath) && fs.existsSync(atlasMapPath)) {
    const b64 = fs.readFileSync(atlasPngPath).toString('base64');
    const mapJson = fs.readFileSync(atlasMapPath, 'utf8').trim();
    atlasBootCode += `window.__PO_ATLAS_URI__="data:image/png;base64,${b64}";window.__PO_ATLAS_MAP__=${mapJson};\n`;
  }
  const topdownPngPath = path.join(rootDir, 'assets', 'tilesets', 'topdown-atlas.png');
  const topdownMapPath = path.join(rootDir, 'assets', 'tilesets', 'topdown-atlas-map.json');
  if (fs.existsSync(topdownPngPath) && fs.existsSync(topdownMapPath)) {
    const tb64 = fs.readFileSync(topdownPngPath).toString('base64');
    const tmapJson = fs.readFileSync(topdownMapPath, 'utf8').trim();
    atlasBootCode += `window.__PO_TOPDOWN_URI__="data:image/png;base64,${tb64}";window.__PO_TOPDOWN_MAP__=${tmapJson};\n`;
  }
  // Escape closing </script> inside bundled JS just in case
  const safeJsCode = (atlasBootCode + jsCode).replace(/<\/script/gi, '<\\/script');
  const safeCssCode = styleCss.replace(/<\/style/gi, '<\\/style');

  let finalHtml = indexHtml
    .replace(
      /<link\s+rel=["']stylesheet["']\s+href=["']\.\/style\.css["']\s*\/?>/i,
      () => `<style>\n${safeCssCode}\n</style>`
    )
    .replace(
      /<script\s+type=["']module["']\s+src=["']\.\/app\.js["']\s*><\/script>/i,
      () => `<script>\n${safeJsCode}\n</script>`
    );

  if (finalHtml.includes('./style.css') || finalHtml.includes('./app.js')) {
    throw new Error('Failed to inline style.css or app.js into office-app.html');
  }

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(outHtmlPath, finalHtml, 'utf8');

  const sizeBytes = Buffer.byteLength(finalHtml, 'utf8');
  if (sizeBytes === 0 || sizeBytes >= 2 * 1024 * 1024) {
    throw new Error(`Unexpected bundle size: ${sizeBytes} bytes (must be > 0 and < 2 MiB)`);
  }

  console.error(
    `[build-ui] Wrote ${outHtmlPath} (${(sizeBytes / 1024).toFixed(1)} KiB)`
  );
}

build().catch((err) => {
  console.error('[build-ui] Build failed:', err);
  process.exit(1);
});
