import { execFileSync } from 'node:child_process';

try {
  await import('vite');
} catch {
  execFileSync('npm', ['install', '--include=dev', '--workspaces=false'], {
    stdio: 'inherit'
  });
}
