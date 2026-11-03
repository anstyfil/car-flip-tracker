import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const scriptPattern = /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g;
const stylePattern = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g;
for (const match of [...html.matchAll(scriptPattern)]) {
  const source = await readFile(path.join(root, 'dist', match[1]), 'utf8');
  html = html.replace(match[0], () => `<script type="module">${source.replace(/<\/script/gi, '<\\/script')}</script>`);
}
for (const match of [...html.matchAll(stylePattern)]) {
  const source = await readFile(path.join(root, 'dist', match[1]), 'utf8');
  html = html.replace(match[0], () => `<style>${source.replace(/<\/style/gi, '<\\/style')}</style>`);
}
const target = path.join(root, 'АвтоКапитал — демо.html');
await writeFile(target, html);
process.stdout.write('Создан самостоятельный файл: АвтоКапитал — демо.html\n');
