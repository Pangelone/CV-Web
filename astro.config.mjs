// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://pabloangelone.com',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  devToolbar: {
    enabled: false,
  },
});
