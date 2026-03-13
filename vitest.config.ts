import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{git,cache,output,temp}/**',
            '**/._*',
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
