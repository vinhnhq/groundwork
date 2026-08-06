import type { Repository } from "@/lib/repository";

/** Ids of any shape become `Map` keys via `String()`. */
const key = <Id>(id: Id): string => String(id);

/**
 * Map-backed generic repository for unit tests. `nextId` mints ids inside
 * `create()`; `parse` (optional) validates at the boundary like a real repo.
 */
export function createInMemoryRepository<T extends Record<string, unknown>, Id>(opts: {
  getId: (item: T) => Id;
  nextId: () => Id;
  parse?: (item: T) => T;
}): Repository<T, Id> {
  const store = new Map<string, T>();

  const put = (item: T): T => {
    const value = opts.parse ? opts.parse(item) : item;
    store.set(key(opts.getId(value)), value);
    return value;
  };

  return {
    async getById(id) {
      return store.get(key(id)) ?? null;
    },
    async getMatching(query) {
      const entries = Object.entries(query) as [keyof T, T[keyof T]][];
      return [...store.values()].filter((item) => entries.every(([k, v]) => item[k] === v));
    },
    async create(item) {
      const id = opts.nextId();
      return put({ ...(item as T), id } as T);
    },
    async save(item) {
      return put(item);
    },
    async update(id, patch) {
      const current = store.get(key(id));
      if (!current) throw new Error(`update: missing entity ${key(id)}`);
      return put({ ...current, ...patch });
    },
    async delete(id) {
      store.delete(key(id));
    },
  };
}
