import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CAPABILITIES, type Capability, ROLE_LABEL } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";

const REASON: Record<Capability, string> = {
  "ops.view": "viewing the ops console",
  "grounding.read": "copying a project's grounding context",
  "tasks.write": "adding or moving tasks",
  "agent.run": "running the triage agent — it spends tokens and proposes work",
  "integrations.view": "seeing the integration wiring, which includes secrets",
};

const isCapability = (value: string): value is Capability =>
  (CAPABILITIES as readonly string[]).includes(value);

/**
 * Explain a role redirect instead of just landing the user back on /ops.
 *
 * The proxy bounces a role-denied navigation here. Without this the PM clicks
 * "Triage", the URL changes, and nothing visible happens — which reads as a
 * broken link rather than a deliberate boundary.
 */
export function DeniedNotice({ denied, role }: { denied?: string; role: Role }) {
  if (!denied || !isCapability(denied)) return null;

  return (
    <Alert
      role="status"
      data-testid="denied-notice"
      className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <ShieldAlert aria-hidden />
      <AlertTitle>Not available to you.</AlertTitle>
      <AlertDescription className="text-amber-900/90 dark:text-amber-200/90">
        The <span className="font-medium">{ROLE_LABEL[role]}</span> role does not cover{" "}
        {REASON[denied]}. Ask the engineer if you need it.
      </AlertDescription>
    </Alert>
  );
}
