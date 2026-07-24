import type { Kysely } from "kysely";
import { describe, expect, it } from "vitest";
import { getContext, type RequestContext, runWithContext, storage } from "@/lib/context";
import type { DB } from "@/lib/db-types";

// A fake connection is enough — these tests exercise ALS propagation, not SQL.
const fakeDb = {} as unknown as Kysely<DB>;
const ctx = (requestId: string): RequestContext => ({ db: fakeDb, user: null, requestId });

describe("request context (ALS)", () => {
  it("getContext throws outside runWithContext", () => {
    expect(() => getContext()).toThrow(/outside runWithContext/);
  });

  it("provides the context inside runWithContext", () => {
    runWithContext(ctx("solo"), () => {
      expect(getContext().requestId).toBe("solo");
    });
  });

  it("nested inner context overrides", () => {
    runWithContext(ctx("outer"), () => {
      runWithContext(ctx("inner"), () => {
        expect(getContext().requestId).toBe("inner");
      });
    });
  });

  it("restores the outer context after the inner returns", () => {
    runWithContext(ctx("outer"), () => {
      runWithContext(ctx("inner"), () => {});
      expect(getContext().requestId).toBe("outer");
    });
  });

  it("isolates parallel async contexts", async () => {
    const run = (id: string) =>
      new Promise<string>((resolve) => {
        runWithContext(ctx(id), () => {
          setTimeout(() => resolve(getContext().requestId), 5);
        });
      });
    const [a, b] = await Promise.all([run("A"), run("B")]);
    expect(a).toBe("A");
    expect(b).toBe("B");
    expect(storage.getStore()).toBeUndefined();
  });
});
