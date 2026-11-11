'use client';

import { forwardRef } from 'react';
import s from './stage.module.css';

/** הלוגו של משכלנתא כפי שהוא נכנס לבמה במסכי הסופה והחוטים */
export const StageLogo = forwardRef<HTMLDivElement>(function StageLogo(_, ref) {
  return (
    <div ref={ref} className={s.logo}>
      <div className={s.logoIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      </div>
      <span className={s.logoWord}>
        מ<em>שכל</em>נתא
      </span>
    </div>
  );
});
