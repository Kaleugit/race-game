import { defineConfig, devices } from '@playwright/test';

// e2e runs against the production bundle (vite build + preview), the same
// artifact Vercel serves, not the dev server.
// Headless Chromium falls back to software WebGL (SwiftShader) on Windows,
// which runs this game at ~7 FPS; with the 0.05s frame cap game time then runs
// ~3x slower than real time. Use the real GPU through ANGLE/D3D11 (~58 FPS).
const gpuArgs = process.platform === 'win32' ? ['--use-angle=d3d11'] : [];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  retries: 0,
  // Every spec runs a full WebGL game on the same integrated GPU; more than two
  // in parallel starve each other and the countdown stalls (measured 2026-09-22).
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 720 },
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1280, height: 720 },
      launchOptions: { args: gpuArgs },
    },
  }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
