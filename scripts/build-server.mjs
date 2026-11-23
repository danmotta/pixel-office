import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outPath = path.join(distDir, 'mcp-server.mjs');

async function build() {
  fs.mkdirSync(distDir, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src', 'mcp-server.mjs')],
    outfile: outPath,
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    legalComments: 'none',
    banner: {
      js: "import { createRequire as __poCreateRequire } from 'node:module';\nconst require = __poCreateRequire(import.meta.url);",
    },
  });
  const sizeBytes = fs.statSync(outPath).size;
  console.error(`[build-server] Wrote ${outPath} (${(sizeBytes / 1024).toFixed(1)} KiB)`);
}

build().catch((err) => {
  console.error('[build-server] Build failed:', err);
  process.exit(1);
});
