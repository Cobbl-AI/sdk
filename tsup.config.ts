import { defineConfig } from 'tsup'

export default defineConfig({
  // Entry points for main, admin, and public
  entry: {
    index: 'src/index.ts',
    admin: 'src/admin.ts',
    public: 'src/public.ts',
  },

  // Output formats
  format: ['cjs', 'esm'],

  // Generate TypeScript declaration files
  dts: true, // Generate types but don't deeply resolve external dependencies

  // Code splitting for better tree-shaking
  splitting: false,

  // Source maps for debugging
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Minify output for smaller bundle size
  minify: false, // Set to true for production if desired

  // Bundle all dependencies
  noExternal: [],

  // Target modern environments (Node 18+)
  target: 'node18',

  // Output directory
  outDir: 'dist',

  // Tree-shake unused code
  treeshake: true,

  // Skip node_modules from bundling (except explicitly included in noExternal)
  skipNodeModulesBundle: true,
})
