import type { ColumnType } from "kysely";
import type { Role } from "@/lib/auth/types";

/**
 * The Kysely database schema.
 *
 * Hand-maintained rather than generated, so integration tests catch drift: the
 * DDL is derived by better-auth from `authOptions` at migrate time, and if the
 * two descriptions of the same table disagree, a test fails instead of a query
 * silently returning `undefined` for a column that was renamed.
 *
 * Column names are better-auth's — camelCase, and therefore quoted in every
 * query — not the snake_case this codebase would otherwise use. They are its
 * tables, so they keep its conventions.
 */

/** Written by a database default on insert, always present on read. */
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type UserTable = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Normalised (lower-cased) — the username plugin's lookup key. */
  username: string | null;
  /** As typed by the person, for display only. */
  displayUsername: string | null;
  /**
   * Capability role (R1). Nullable in the DDL because better-auth applies the
   * `"client"` default in application code rather than as a column default —
   * so read it as `role ?? "client"` and never assume it is present.
   */
  role: Role | null;
};

export type SessionTable = {
  id: string;
  expiresAt: Timestamp;
  token: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
};

export type AccountTable = {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Timestamp | null;
  refreshTokenExpiresAt: Timestamp | null;
  scope: string | null;
  /** Scrypt hash for the `credential` provider. Never selected outside auth. */
  password: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type VerificationTable = {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type DB = {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
};
