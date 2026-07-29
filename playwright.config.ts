import { defineConfig, devices } from "@playwright/test";

// Dedicated E2E port (not the dev 3000) so a stray dev server never silently
// tests the wrong DB (tech-standards §12).
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run start -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: {
      // NODE_ENV=test skips .env.local — forward secrets the server needs here.
      PROJECT_ROOTS: process.env.PROJECT_ROOTS ?? "",
      // `next start` runs as production, where both default credentials are
      // deliberately refused — so E2E must supply real ones, which also means
      // it exercises the configured path rather than the dev fallback.
      MCP_TOKEN: "e2e-mcp-token",
      BETTER_AUTH_SECRET: "e2e-session-secret-not-the-published-one",
    },
  },
});
