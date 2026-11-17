import Link from 'next/link';

/** "מופעל על ידי משכלנתא" — שורה קטנה ושקטה בתחתית כל מסך ממותג של משרד */
export function PoweredBy({ className = '', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const colors =
    tone === 'dark'
      ? { text: 'text-white/40', link: 'text-white/60 hover:text-white' }
      : { text: 'text-slate-400', link: 'text-slate-500 hover:text-slate-700' };
  return (
    <p className={`text-center text-2xs font-semibold ${colors.text} ${className}`}>
      מופעל על ידי{' '}
      <Link href="/" className={`font-black ${colors.link}`}>
        משכלנתא
      </Link>{' '}
      · פלטפורמת המשכנתאות ליועצים
    </p>
  );
}
