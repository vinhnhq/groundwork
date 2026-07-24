/**
 * Typed left-to-right value pipe (tech-standards §3). es-toolkit ships `flow`
 * (call-style), not `pipe` (value-style), so hand-rolled with explicit overloads.
 */
export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;
export function pipe(a: unknown, ...fns: Array<(x: unknown) => unknown>): unknown {
  return fns.reduce((acc, fn) => fn(acc), a);
}
