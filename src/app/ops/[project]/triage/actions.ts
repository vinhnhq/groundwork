"use server";

import { getContentSource } from "@/lib/content";
import { getAnalyzer } from "@/lib/triage/analyzer";
import { listAccepted, recordAccepted, renderBacklogBlock } from "@/lib/triage/store";
import type { DraftTicket, TriageResult } from "@/lib/triage/types";

export async function analyzeIdea(project: string, text: string): Promise<TriageResult> {
  return getAnalyzer(getContentSource()).analyze({ project, text });
}

export async function acceptDraft(
  project: string,
  draft: DraftTicket,
): Promise<{ block: string; count: number }> {
  recordAccepted(project, draft);
  return { block: renderBacklogBlock(draft), count: listAccepted(project).length };
}
