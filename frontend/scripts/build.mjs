import { build } from 'vite';
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');
const frontendDist = path.resolve(frontendDir, 'dist');
const outputDirs = new Set([
  path.resolve(frontendDir, '..', 'dist'),
  path.resolve(process.cwd(), 'dist')
]);

await build({ root: frontendDir });

for (const outputDir of outputDirs) {
  if (outputDir === frontendDist) continue;
  await rm(outputDir, { recursive: true, force: true });
  await cp(frontendDist, outputDir, { recursive: true });
}
