import { defineConfig, devices } from '@playwright/test';

/** E2E 전용 포트(1313과 겹침 방지). `data-presentation-cover` 등에는 쓰이지 않음 — single.html은 루트 상대 경로를 씁니다. */
const PORT = 13714;
/** `localhost`로 통일 — 페이지와 livereload WebSocket 호스트가 같아야 연결이 안정적입니다. */
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `hugo server -D --environment development --port ${PORT} --bind 0.0.0.0 --renderToMemory`,
    url: `${BASE}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
