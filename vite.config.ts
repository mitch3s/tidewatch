import { defineConfig, type Plugin } from 'vite';

/**
 * webOS loads the app from the file system, and older webOS Chromium builds
 * don't support ES modules. So the release build is a single classic (IIFE)
 * script, and this plugin removes the module attributes from index.html.
 */
function classicScript(): Plugin {
  return {
    name: 'tidewatch-classic-script',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/<script type="module"/g, '<script defer')
        .replace(/ crossorigin/g, '');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [classicScript()],
  build: {
    target: 'es2017',
    cssTarget: 'chrome68',
    outDir: 'dist',
    assetsInlineLimit: 0,
    modulePreload: false,
    rolldownOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: { host: true, port: 5173 },
});
