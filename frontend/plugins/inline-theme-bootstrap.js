import { buildSync } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER = '<!-- fc-bootstrap -->';

export default function inlineThemeBootstrap() {
  const entry = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../src/theme/fouc-bootstrap.js',
  );

  const bundle = () => buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    logLevel: 'silent',
    target: ['es2020'],
    supported: { 'inline-script': true },
  }).outputFiles[0].text;

  return {
    name: 'inline-theme-bootstrap',
    enforce: 'post',
    transformIndexHtml(html) {
      return {
        html: html.replace(PLACEHOLDER, ''),
        tags: [{ tag: 'script', children: bundle(), injectTo: 'head' }],
      };
    },
  };
}
