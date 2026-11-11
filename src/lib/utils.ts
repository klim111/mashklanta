import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge"

// מלמד את tailwind-merge שגדלי הטיפוגרפיה המשותפים (tailwind.config.js) הם גודל
// גופן ולא צבע — אחרת cn('text-title', 'text-slate-900') היה מוחק את הגודל
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['2xs', 'info', 'button', 'cta', 'subtitle', 'title'],
    },
    // רקעי הגרדיאנט המשותפים הם תמונת רקע, לא צבע, ולכן לא מבטלים את bg-* של צבע
    classGroups: {
      'bg-image': [{ bg: ['brand-dark', 'hero-soft'] }],
    },
  },
});

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
} 