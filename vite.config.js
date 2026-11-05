import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commentApi from './api/comment.js';

// Vite dev and Vercel production use exactly the same server-side AI endpoint.
export default defineConfig({
  plugins: [react(), {
    name: 'toxicbook-local-api',
    configureServer(server) {
      server.middlewares.use('/api/comment', (req, res, next) => {
        if (req.method === 'POST' || req.method === 'GET') {
          Promise.resolve(commentApi(req, res)).catch(next);
        } else next();
      });
    },
  }],
});
