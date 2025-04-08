import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to format timestamp
export const formatTimestamp = (timestamp: Date | string | undefined): string => {
  if (!timestamp) return '--:--:--';
  try {
    // Ensure it's a Date object. If it's a string, parse it.
    const date = typeof timestamp === 'string' ? new Date(Date.parse(timestamp)) : timestamp;
    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) return '--:--:--'; 
    return date.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit' // Add seconds
    });
  } catch (e) {
    console.error("Error formatting timestamp:", timestamp, e);
    return '--:--:--';
  }
};
