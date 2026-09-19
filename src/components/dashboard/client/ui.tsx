'use client';

import type { ReactNode } from 'react';

/**
 * כרטיס של הדאשבורד: כותרת ממורכזת ובולטת, אייקון, ופעולה משמאל.
 * הכותרת מספיק גדולה כדי לזהות את האזור במבט אחד מרחוק.
 */
export function DashCard({
  title,
  icon,
  action,
  children,
  className = '',
  id,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span />
        <h2 className="flex items-center justify-center gap-2 text-center text-lg font-black text-slate-900">
          {icon}
          {title}
        </h2>
        <span className="flex justify-end">{action}</span>
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
