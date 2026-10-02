import { defineConfig } from "@playwright/test";

const PORT = 4174;

/** Smoke tests against the production build: every page renders, and core interactions work. */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}/tfteam-builder/`,
    // CI installs Playwright's Chromium; locally the installed Chrome is enough.
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/tfteam-builder/`,
    reuseExistingServer: !process.env.CI,
  },
});
