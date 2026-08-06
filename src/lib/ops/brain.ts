import "server-only";
import type { Brain, BrainAudience } from "@/lib/brain";
import { loadBrain } from "@/lib/brain";
import { getContentSource } from "@/lib/content";

/** The app-side entry to the digest: same assembler, app's configured source. */
export function loadProjectBrain(
  slug: string,
  budget?: number,
  audience?: BrainAudience,
): Promise<Brain | null> {
  return loadBrain(slug, getContentSource(), budget, audience);
}
