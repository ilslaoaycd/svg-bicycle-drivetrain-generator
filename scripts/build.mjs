import { rm } from 'node:fs/promises';
import { build } from 'esbuild';

const entryPoints = ['src/index.js'];

await rm('dist', { recursive: true, force: true });

await build({
  entryPoints,
  outfile: 'dist/index.mjs',
  bundle: true,
  format: 'esm',
  sourcemap: true,
  target: 'es2020'
});

await build({
  entryPoints,
  outfile: 'dist/index.cjs',
  bundle: true,
  format: 'cjs',
  sourcemap: true,
  target: 'es2020'
});

await build({
  entryPoints,
  outfile: 'dist/bicycle-drivetrain-svg.global.js',
  bundle: true,
  format: 'iife',
  globalName: 'BicycleDrivetrainSVG',
  sourcemap: true,
  target: 'es2020'
});
