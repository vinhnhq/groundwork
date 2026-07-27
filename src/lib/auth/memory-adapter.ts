import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Role, User } from "@/lib/auth/types";

/**
 * The account store, in memory, until F5's Neon/better-auth adapter lands.
 *
 * Passwords are scrypt-hashed with a per-user salt rather than compared as
 * plaintext. That is not because this store is secure — it holds four demo
 * accounts and forgets them on restart — but because the moment a real adapter
 * replaces it, whatever shape this had is the shape someone copies.
 */

export type AuthAdapter = {
  readonly kind: "memory" | "better-auth";
  /** The account, or null when the email is unknown or the password is wrong. */
  verify(email: string, password: string): Promise<User | null>;
  listDemoAccounts(): { email: string; role: Role; password?: string }[];
};

type StoredUser = User & { salt: string; hash: Buffer };

const hash = (password: string, salt: string): Buffer => scryptSync(password, salt, 32);

function makeUser(email: string, name: string, role: Role, password: string): StoredUser {
  const salt = randomUUID();
  return { id: randomUUID(), email, name, role, salt, hash: hash(password, salt) };
}

/** One demo account per role, so every permission path is reachable by hand. */
export const DEMO_PASSWORD = "groundwork";

export function createMemoryAuthAdapter(password: string = DEMO_PASSWORD): AuthAdapter {
  const users: StoredUser[] = [
    makeUser("engineer@groundwork.local", "Vinh (engineer)", "engineer", password),
    makeUser("pm@groundwork.local", "Priya (PM)", "pm", password),
    makeUser("qa@groundwork.local", "Sam (QA)", "qa", password),
    makeUser("client@groundwork.local", "Acme (client)", "client", password),
  ];

  return {
    kind: "memory",

    async verify(email, candidate) {
      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      // Hash regardless of whether the user exists, so a wrong email and a wrong
      // password take the same time to reject.
      const attempt = hash(candidate, user?.salt ?? "absent");
      if (!user) return null;
      if (attempt.length !== user.hash.length || !timingSafeEqual(attempt, user.hash)) return null;

      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },

    listDemoAccounts() {
      return users.map((u) => ({ email: u.email, role: u.role, password }));
    },
  };
}
