/**
 * Vite setup for compiling React and serving the prototype. This configuration has no
 * backend/API proxy.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
