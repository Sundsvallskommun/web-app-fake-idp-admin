import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui class-name helper. Merges conditional classes (clsx) and resolves
 * conflicting Tailwind utilities so the last one wins (tailwind-merge).
 *
 * Replaces `cx` from `@sk-web-gui/react`, which only concatenated.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
