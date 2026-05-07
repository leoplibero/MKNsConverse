import { build } from 'vite';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');
const frontendDist = path.resolve(frontendDir, 'dist');
const vercelOutput = path.resolve(frontendDir, '..', '.vercel', 'output');
const vercelStatic = path.resolve(vercelOutput, 'static');
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

await rm(vercelOutput, { recursive: true, force: true });
await mkdir(vercelStatic, { recursive: true });
await cp(frontendDist, vercelStatic, { recursive: true });
await writeFile(
  path.resolve(vercelOutput, 'config.json'),
  JSON.stringify({
    version: 3,
    routes: [
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' }
    ]
  }, null, 2)
);

for (const outputDir of [frontendDist, ...outputDirs, vercelStatic]) {
  try {
    const entries = await readdir(outputDir);
    console.log(`vercel output ready: ${outputDir} (${entries.join(', ')})`);
  } catch {
    console.log(`vercel output missing: ${outputDir}`);
  }
}
