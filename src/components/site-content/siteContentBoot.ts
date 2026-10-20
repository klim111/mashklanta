import { ALL_PAGES, type SiteContent } from '@/lib/site-content';

/**
 * עמוד שיש בו החלפות טקסט מוסתר לרגע עד שהן מוחלות, כדי שהגולש לא יראה את
 * הטקסט הישן מהבהב לפני החדש. ההסתרה מוגבלת בזמן: אם משהו משתבש, העמוד מוצג
 * בכל מקרה. רץ ב-<head> לפני שהעמוד מצויר.
 */
export const SITE_CONTENT_PENDING_CLASS = 'site-content-pending';
const MAX_HIDDEN_MS = 1500;

export const SITE_CONTENT_BOOT_STYLE = `html.${SITE_CONTENT_PENDING_CLASS} body{visibility:hidden}`;

/** אותה התאמה כמו `pageMatches` ב-src/lib/site-content.ts, ב-JavaScript פשוט */
export function siteContentBootScript(content: SiteContent): string | null {
  const pages = Array.from(new Set(content.texts.map((rule) => rule.page)));
  if (pages.length === 0) return null;
  return `(function(){try{var p=location.pathname.replace(/\\/+$/,'')||'/';var all=${JSON.stringify(ALL_PAGES)};var ps=${JSON.stringify(pages).replace(/</g, '\\u003c')};var hit=ps.some(function(x){if(x===all)return true;if(x.indexOf('*')<0)return x===p;var a=x.split('/'),b=p.split('/'),t=a[a.length-1]==='*';if(t?b.length<a.length:b.length!==a.length)return false;for(var i=0;i<a.length;i++){if(a[i]!=='*'&&a[i]!==b[i])return false}return true});if(hit){var h=document.documentElement;h.classList.add(${JSON.stringify(SITE_CONTENT_PENDING_CLASS)});setTimeout(function(){h.classList.remove(${JSON.stringify(SITE_CONTENT_PENDING_CLASS)})},${MAX_HIDDEN_MS})}}catch(e){}})();`;
}
