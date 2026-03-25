import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['dist/src/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: '_aws_lambda_build/nodejs/node_modules/@project/backend/index.js',
  external: ['pg-native'],
  treeShaking: true,
  minify: false,
  sourcemap: false,
  banner: {
    js: [
      'import { createRequire } from "module";',
      'const require = createRequire(import.meta.url);',
    ].join('\n'),
  },
});

console.log('Lambda build complete.');
