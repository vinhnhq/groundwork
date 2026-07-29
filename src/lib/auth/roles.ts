import type { Role } from "@/lib/auth/types";

/**
 * What each role may do (R1).
 *
 * A matrix rather than a rank, because the roles are not a hierarchy: QA may
 * move a task but must not drive the triage agent, while a client may read
 * things QA can act on. Expressing that as "levels" would force one of those
 * two facts to be wrong.
 */
export const CAPABILITIES = [
  /** See the ops console at all. */
  "ops.view",
  /** Copy the Brain digest / use the grounding doors. */
  "grounding.read",
  /** Capture tasks and move statuses (write-back). */
  "tasks.write",
  /** Drive the triage agent — it consumes tokens and proposes work. */
  "agent.run",
  /** See transports, tokens and mock-vs-live wiring. */
  "integrations.view",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const MATRIX: Record<Role, readonly Capability[]> = {
  // The engineer owns the repo and the agent.
  engineer: ["ops.view", "grounding.read", "tasks.write", "agent.run", "integrations.view"],
  // PM and QA run the board and ground their own agents, but do not spend
  // tokens through Groundwork's agent or see its secrets.
  pm: ["ops.view", "grounding.read", "tasks.write"],
  qa: ["ops.view", "grounding.read", "tasks.write"],
  // A client sees the state of play and nothing else.
  client: ["ops.view"],
};

export const can = (role: Role, capability: Capability): boolean =>
  MATRIX[role].includes(capability);

export const capabilitiesOf = (role: Role): readonly Capability[] => MATRIX[role];

export const ROLE_LABEL: Record<Role, string> = {
  engineer: "Engineer",
  pm: "PM",
  qa: "QA",
  client: "Client",
};

export const ROLE_BLURB: Record<Role, string> = {
  engineer: "Full access — write-back, the triage agent, and the integration wiring.",
  pm: "Board and grounding: capture tasks, move statuses, copy context. No agent.",
  qa: "Board and grounding: move tasks through states, copy context. No agent.",
  client: "Read-only: see projects, docs and progress. Nothing to change.",
};
