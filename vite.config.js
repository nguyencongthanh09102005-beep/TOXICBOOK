import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import commentHandler from './api/comment.js';
import sessionHandler from './api/session.js';
import stateHandler from './api/state.js';

// For Vite dev, .env.local is not automatically injected into process.env.
// Only server-side handlers read these secrets; nothing is bundled into React.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FALLBACK_MODEL','TOXICBOOK_OWNER_PASSWORD','TOXICBOOK_SESSION_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), {
      name: 'toxicbook-local-server',
      configureServer(server) {
        for (const [path, handler] of [['/api/comment',commentHandler],['/api/session',sessionHandler],['/api/state',stateHandler]]) {
          server.middlewares.use(path, (req,res,next) => Promise.resolve(handler(req,res)).catch(next));
        }
      },
    }],
  };
});
