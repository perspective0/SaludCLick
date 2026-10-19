import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const binaries = [ffmpegPath, ffprobe.path];
for (const binary of binaries) {
  if (!binary || !existsSync(binary)) {
    throw new Error('Falta FFmpeg o FFprobe local. Ejecuta npm ci en composition/.');
  }
}

// Studio and its background renderer must inherit the same media tools.
// Windows treats PATH keys case-insensitively; keep exactly one spelling.
const env = { ...process.env };
const pathKeys = Object.keys(env).filter(key => key.toLowerCase() === 'path');
const inheritedPath = pathKeys.map(key => env[key]).filter(Boolean).join(path.delimiter);
for (const key of pathKeys) delete env[key];
env[process.platform === 'win32' ? 'Path' : 'PATH'] = [
  ...binaries.map(binary => path.dirname(binary)), inheritedPath,
].join(path.delimiter);

const npmBin = process.env.npm_execpath
  ? path.dirname(process.env.npm_execpath)
  : path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin');
const npxCli = path.join(npmBin, 'npx-cli.js');
if (!existsSync(npxCli)) throw new Error('No se encontró npx. Inicia con npm run dev.');
const { hyperframesVersion } = JSON.parse(readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(hyperframesVersion)) throw new Error('Versión de Hyperframes inválida.');

const child = spawn(process.execPath, [
  npxCli, '--yes', `hyperframes@${hyperframesVersion}`, ...process.argv.slice(2),
], { cwd: projectDir, env, stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
