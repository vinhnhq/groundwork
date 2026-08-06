import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * `.env.local` values, for the database-backed integration tests.
 *
 * Next loads `.env.local` for `bun run dev`; Vitest does not, so without this
 * the auth integration suite fails with "DATABASE_TEST_URL is not set" on a
 * laptop where the developer has already configured it. The empty prefix
 * loads unprefixed names — Vite otherwise exposes only `VITE_*`. CI has no
 * `.env.local` and sets the variable in the job environment, which `loadEnv`
 * leaves alone.
 */
const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      // Node-side tests can't import these Next markers — stub to empty.
      "server-only": r("./src/tests/stubs/empty.ts"),
      "client-only": r("./src/tests/stubs/empty.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/tests/integration/**", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/tests/integration/**/*.int.test.ts"],
          env: {
            DATABASE_TEST_URL: env.DATABASE_TEST_URL ?? "",
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      reporter: ["text", "html"],
    },
  },
});
