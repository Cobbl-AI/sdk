import { defineConfig } from 'tsup'

export default defineConfig([
  // Main CJS + ESM build
  {
    entry: {
      index: 'src/index.ts',
      admin: 'src/admin.ts',
      public: 'src/public.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    noExternal: [],
    target: 'node18',
    outDir: 'dist',
    treeshake: true,
    skipNodeModulesBundle: true,
  },
  // IIFE build for script tag / CDN (exposes window.Cobbl)
  {
    entry: { 'cobbl-sdk': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Cobbl',
    splitting: false,
    sourcemap: true,
    minify: true,
    outDir: 'dist',
  },
])
