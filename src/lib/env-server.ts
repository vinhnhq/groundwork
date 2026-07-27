import "server-only";
import { z } from "zod";

/**
 * Server-only, zod-validated environment. Fields are optional until the phase
 * that needs them (DB/auth land in F5); a lazy singleton parses once.
 */
const schema = z.object({
  PROJECT_ROOTS: z.string().optional(),
  // Mock auth (replaced by better-auth later). Default demo password if unset.
  ADMIN_PASSWORD: z.string().optional(),
  // Triage agent (mock analyzer used when absent).
  ANTHROPIC_API_KEY: z.string().optional(),
  // Remote MCP door (G4). Absent outside production ⇒ the dev token applies.
  MCP_TOKEN: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DATABASE_TEST_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
