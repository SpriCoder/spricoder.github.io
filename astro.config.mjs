import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://spricoder.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
