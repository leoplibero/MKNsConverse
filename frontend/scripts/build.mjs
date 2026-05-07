import { build } from 'vite';
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';

await build();

const frontendDist = path.resolve(process.cwd(), 'dist');
const rootDist = path.resolve(process.cwd(), '..', 'dist');

await rm(rootDist, { recursive: true, force: true });
await cp(frontendDist, rootDist, { recursive: true });
