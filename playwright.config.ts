import { defineConfig } from "@playwright/test";

const PORT = 4174;

/** Smoke tests against the production build: every page renders, and core interactions work. */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // Many parallel browsers each load a set's game data cold, so a page can take a few seconds to render.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}/tfteam/`,
    // CI installs Playwright's Chromium; locally the installed Chrome is enough.
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/tfteam/`,
    // Always a fresh server: a leftover preview would serve whatever build it started with.
    reuseExistingServer: false,
  },
});
