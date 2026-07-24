import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn class-name merge helper. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
