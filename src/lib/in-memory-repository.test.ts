import { describe, expect, it } from "vitest";
import { createInMemoryRepository } from "@/lib/in-memory-repository";

type Widget = { id: number; name: string; color: string };

function makeRepo() {
  let seq = 0;
  return createInMemoryRepository<Widget, number>({
    getId: (w) => w.id,
    nextId: () => ++seq,
  });
}

describe("in-memory repository", () => {
  it("round-trips CRUD", async () => {
    const repo = makeRepo();
    const created = await repo.create({ name: "a", color: "red" });
    expect(created.id).toBe(1);

    expect(await repo.getById(1)).toEqual(created);

    const updated = await repo.update(1, { color: "blue" });
    expect(updated.color).toBe("blue");

    await repo.delete(1);
    expect(await repo.getById(1)).toBeNull();
  });

  it("save honors a caller-minted id", async () => {
    const repo = makeRepo();
    await repo.save({ id: 99, name: "x", color: "green" });
    expect(await repo.getById(99)).toEqual({ id: 99, name: "x", color: "green" });
  });

  it("getMatching filters by query fields", async () => {
    const repo = makeRepo();
    await repo.create({ name: "a", color: "red" });
    await repo.create({ name: "b", color: "red" });
    await repo.create({ name: "c", color: "blue" });
    expect((await repo.getMatching({ color: "red" })).length).toBe(2);
    expect((await repo.getMatching({ name: "c" })).length).toBe(1);
  });

  it("update throws on a missing entity", async () => {
    const repo = makeRepo();
    await expect(repo.update(1, { color: "x" })).rejects.toThrow(/missing entity/);
  });
});
