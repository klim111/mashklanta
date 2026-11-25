import type { ReactNode } from 'react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import { LEGAL_UPDATED_AT } from '@/lib/site-contact';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * מסגרת משותפת למסמכים המשפטיים (מדיניות פרטיות, תנאי שימוש): כותרת, מועד
 * עדכון, תוכן עניינים עם עוגנים וסעיפים ממוספרים. העמוד ציבורי ומותאם לנייד.
 */
export function LegalDocument({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-right">
      <NavBar />

      <header className="legal-doc bg-hero-soft border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="text-title font-extrabold text-slate-900">{title}</h1>
          <p className="mt-2 text-2xs font-semibold text-slate-500">עודכן לאחרונה: {LEGAL_UPDATED_AT}</p>
          <div className="mt-5 space-y-3 text-base leading-relaxed text-slate-700">{intro}</div>
        </div>
      </header>

      <main className="legal-doc mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <nav aria-labelledby="legal-toc" className="mb-10 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="legal-toc" className="mb-3 text-base font-extrabold text-slate-900">
            תוכן העניינים
          </h2>
          <ol className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-blue-700 hover:underline">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-6">
              <h2 id={`${section.id}-title`} className="mb-3 text-subtitle font-extrabold text-slate-900">
                {index + 1}. {section.title}
              </h2>
              <div className="legal-body space-y-3 text-base leading-relaxed text-slate-700">{section.body}</div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** רשימה בתוך סעיף — עם תבליטים ומרווח קריא */
export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pr-5 marker:text-slate-400">{children}</ul>;
}

/** תת-כותרת בתוך סעיף */
export function LegalSub({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-base font-extrabold text-slate-900">{children}</h3>;
}
