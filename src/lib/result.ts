/**
 * Homemade Result<E, A> for synchronous fallible code (tech-standards §3).
 * Graduate to purify-ts Either/EitherAsync only when ≥3 sequential dependent
 * steps need chaining.
 */
export type Result<E, A> =
  | { readonly _tag: "ok"; readonly value: A }
  | { readonly _tag: "err"; readonly error: E };

export const ok = <A>(value: A): Result<never, A> => ({ _tag: "ok", value });
export const err = <E>(error: E): Result<E, never> => ({ _tag: "err", error });

export const isOk = <E, A>(r: Result<E, A>): r is { _tag: "ok"; value: A } => r._tag === "ok";
export const isErr = <E, A>(r: Result<E, A>): r is { _tag: "err"; error: E } => r._tag === "err";

export const map = <E, A, B>(r: Result<E, A>, f: (a: A) => B): Result<E, B> =>
  r._tag === "ok" ? ok(f(r.value)) : err(r.error);

export const chain = <E, A, F, B>(r: Result<E, A>, f: (a: A) => Result<F, B>): Result<E | F, B> =>
  r._tag === "ok" ? f(r.value) : err(r.error);

export const mapError = <E, A, F>(r: Result<E, A>, f: (e: E) => F): Result<F, A> =>
  r._tag === "err" ? err(f(r.error)) : ok(r.value);

export const match = <E, A, B>(r: Result<E, A>, m: { ok: (a: A) => B; err: (e: E) => B }): B =>
  r._tag === "ok" ? m.ok(r.value) : m.err(r.error);
