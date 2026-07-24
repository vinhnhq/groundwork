/**
 * CLI-safe database URL access — reads `process.env` directly (no request
 * context), so migrate/seed scripts can use it outside Next.
 */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_TEST_URL;
  if (!url) throw new Error("DATABASE_TEST_URL is not set");
  return url;
}
