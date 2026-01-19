import { defineConfig } from 'vite';

export default defineConfig({
    base: '/coinpulse/',
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://localhost:3000',
                ws: true,
            }
        }
    }
});
