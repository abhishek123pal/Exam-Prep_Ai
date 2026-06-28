import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// यह फंक्शन डायनामिक Tailwind क्लासेस को आपस में टकराने से रोकेगा
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}