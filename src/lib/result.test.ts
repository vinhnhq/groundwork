import { describe, expect, it } from "vitest";
import { chain, err, isErr, isOk, map, mapError, match, ok } from "@/lib/result";

describe("result", () => {
  it("constructs and narrows ok/err", () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isErr(ok(1))).toBe(false);
    expect(isErr(err("e"))).toBe(true);
    expect(isOk(err("e"))).toBe(false);
  });

  it("map transforms ok, passes err through", () => {
    expect(map(ok(2), (n) => n * 3)).toEqual(ok(6));
    expect(map(err("boom"), (n: number) => n * 3)).toEqual(err("boom"));
  });

  it("chain sequences ok, short-circuits err", () => {
    const half = (n: number) => (n % 2 === 0 ? ok(n / 2) : err("odd"));
    expect(chain(ok(8), half)).toEqual(ok(4));
    expect(chain(ok(7), half)).toEqual(err("odd"));
    expect(chain(err("first"), half)).toEqual(err("first"));
  });

  it("mapError transforms err, passes ok through", () => {
    expect(mapError(err("x"), (e) => `${e}!`)).toEqual(err("x!"));
    expect(mapError(ok(1), (e: string) => `${e}!`)).toEqual(ok(1));
  });

  it("match folds both branches", () => {
    expect(match(ok(5), { ok: (n) => `v${n}`, err: (e) => `e${e}` })).toBe("v5");
    expect(match(err("z"), { ok: (n: number) => `v${n}`, err: (e) => `e${e}` })).toBe("ez");
  });
});
