import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return "--:--:--";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--:--:--";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
