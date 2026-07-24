"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth-mock";

export async function signInAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/ops");
  if (!(await signIn(password))) return { error: "Incorrect password." };
  redirect(from.startsWith("/ops") ? from : "/ops");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/sign-in");
}
