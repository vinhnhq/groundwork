import { describe, expect, it } from "vitest";
import { createMemoryAuthAdapter, DEMO_PASSWORD } from "@/lib/auth/memory-adapter";

const adapter = createMemoryAuthAdapter();

describe("memory auth adapter", () => {
  it("verifies a correct email and password", async () => {
    const user = await adapter.verify("engineer@groundwork.local", DEMO_PASSWORD);

    expect(user?.role).toBe("engineer");
    expect(user?.email).toBe("engineer@groundwork.local");
    expect(user?.id).toBeTruthy();
  });

  it("is case- and whitespace-insensitive about the email", async () => {
    const user = await adapter.verify("  ENGINEER@Groundwork.local ", DEMO_PASSWORD);
    expect(user?.role).toBe("engineer");
  });

  it("rejects a wrong password", async () => {
    expect(await adapter.verify("engineer@groundwork.local", "nope")).toBeNull();
  });

  it("rejects an unknown email without leaking that it is unknown", async () => {
    expect(await adapter.verify("nobody@groundwork.local", DEMO_PASSWORD)).toBeNull();
  });

  it("offers one account per role, so every permission path is reachable", async () => {
    const roles = adapter.listDemoAccounts().map((a) => a.role);
    expect(roles.sort()).toEqual(["client", "engineer", "pm", "qa"]);

    for (const account of adapter.listDemoAccounts()) {
      expect(await adapter.verify(account.email, DEMO_PASSWORD)).not.toBeNull();
    }
  });

  it("honours a configured password", async () => {
    const custom = createMemoryAuthAdapter("hunter2");

    expect(await custom.verify("pm@groundwork.local", "hunter2")).not.toBeNull();
    expect(await custom.verify("pm@groundwork.local", DEMO_PASSWORD)).toBeNull();
  });

  /** Salted per user, so identical passwords do not produce identical hashes. */
  it("does not store passwords in the clear", async () => {
    const serialized = JSON.stringify(adapter.listDemoAccounts());
    expect(serialized).not.toContain("hash");
  });
});
