/**
 * assertNever — put in the `default:` branch of a switch-on-union and after a
 * ts-pattern `.exhaustive()` for paranoia. A non-exhaustive switch fails to
 * typecheck because the residual union isn't assignable to `never`.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}
