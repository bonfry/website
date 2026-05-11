import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://bonfry.com',
    integrations: [sitemap()],
});
