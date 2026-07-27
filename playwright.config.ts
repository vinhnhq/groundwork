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
      // `next start` runs as production, where the dev-token fallback is
      // deliberately refused (G4) — so the remote MCP door needs a real token.
      MCP_TOKEN: "e2e-mcp-token",
    },
  },
});
