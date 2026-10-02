import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://redfire29.github.io',
  base: '/fx-simulator',
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()]
  }
});
