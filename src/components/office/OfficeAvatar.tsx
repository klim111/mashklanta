/* eslint-disable @next/next/no-img-element -- תמונות שהיועץ העלה, מוגשות מ-/api/site-images */
import { initials } from '@/lib/office';

/** התמונה של היועץ, ובלעדיה — ראשי התיבות על רקע בצבע המשרד */
export function OfficeAvatar({
  name,
  photoUrl,
  size = 'md',
  className = '',
}: {
  name: string;
  photoUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = size === 'lg' ? 'h-24 w-24 text-2xl' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-14 w-14 text-base';
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`${box} shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-[var(--office)] font-black text-white ${className}`}
    >
      {initials(name)}
    </span>
  );
}

/** הלוגו של המשרד, ובלעדיו — שם המשרד בטקסט */
export function OfficeLogo({
  name,
  logoUrl,
  className = 'h-10',
  textClassName = 'text-lg font-black text-slate-900',
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
  textClassName?: string;
}) {
  if (logoUrl) return <img src={logoUrl} alt={name} className={`${className} w-auto max-w-[12rem] object-contain`} />;
  return <span className={textClassName}>{name}</span>;
}
