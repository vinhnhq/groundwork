import { z } from "zod";

/**
 * Client-safe environment — only `NEXT_PUBLIC_*` values ever belong here.
 * Empty for now; add fields as public config is introduced.
 */
const schema = z.object({});

export type ClientEnv = z.infer<typeof schema>;

export function clientEnv(): ClientEnv {
  return schema.parse({});
}
