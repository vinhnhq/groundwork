/**
 * Generic repository contract (tech-standards §4/§6). Two implementations per
 * entity: an in-memory twin for tests, a DB-backed one for production. Repos
 * read the db connection from context — never `import { db }` directly.
 */
export type MissingEntityError = { readonly _tag: "MissingEntity"; readonly id: string };

export const missingEntity = (id: string | number): MissingEntityError => ({
  _tag: "MissingEntity",
  id: String(id),
});

export type Query<T> = Partial<T>;

export interface Repository<T, Id> {
  getById(id: Id): Promise<T | null>;
  getMatching(query: Query<T>): Promise<T[]>;
  create(item: Omit<T, "id">): Promise<T>;
  /** Honors a caller-minted id (needed when the id doubles as a foreign key). */
  save(item: T): Promise<T>;
  update(id: Id, patch: Partial<T>): Promise<T>;
  delete(id: Id): Promise<void>;
}
