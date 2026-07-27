"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

export async function signInAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/ops");

  // One message for both a bad email and a bad password — naming which was
  // wrong turns the form into an account enumerator.
  if (!(await signIn(email, password))) return { error: "Incorrect email or password." };

  redirect(from.startsWith("/ops") ? from : "/ops");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/sign-in");
}
