/** Team roles (R1). Ordered loosely by breadth, but capability is a matrix. */
export const ROLES = ["engineer", "pm", "qa", "client"] as const;

export type Role = (typeof ROLES)[number];

export type User = { id: string; email: string; name: string; role: Role };

export type Session = { user: User; expiresAt: Date };

export const isRole = (value: string): value is Role =>
  (ROLES as readonly string[]).includes(value);
