// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.pabloangelone.com',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  devToolbar: {
    enabled: false,
  },
});
