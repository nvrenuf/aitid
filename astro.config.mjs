import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    edgeMiddleware: false,
    functionPerRoute: false,
    maxDuration: 60,
  }),
  vite: {
    define: {
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.ANTHROPIC_API_KEY),
    },
  },
});
