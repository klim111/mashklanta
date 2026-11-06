import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';

/**
 * חלקים משותפים למסכי ההתחברות וההרשמה, כדי שכולם ייראו ויתנהגו אותו דבר:
 * העיגול שבראש הכרטיס מוביל לדף הבית, ומתחת לכרטיס — "חזרה לדף הבית".
 */

/** העיגול שבראש הכרטיס. ברירת המחדל: אייקון הבית על רקע כחול. `className` קובע רקע ורווח */
export function AuthLogo({ children, className = 'mb-4 bg-blue-600' }: { children?: ReactNode; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="דף הבית"
      title="דף הבית"
      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${className}`}
    >
      {children ?? <Home className="h-8 w-8 text-white" />}
    </Link>
  );
}

/** "חזרה לדף הבית" — מתחת לכרטיס, בכל מסכי ההתחברות */
export function BackHomeLink() {
  return (
    <div className="mt-6 text-center">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-800">
        <Home className="h-4 w-4" />
        חזרה לדף הבית
      </Link>
    </div>
  );
}
