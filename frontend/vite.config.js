import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue()],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: true
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true
        }
      }
    }
  };
});
