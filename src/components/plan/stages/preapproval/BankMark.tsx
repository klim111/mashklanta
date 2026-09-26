'use client';

import React from 'react';
import type { PreApprovalBankInfo } from './banks';

/**
 * הסמל של הבנק בשורה: אריח בצבע המותג עם ראשי התיבות של שם הבנק.
 *
 * הסמל מצויר כאן ואינו נטען מהאתר של הבנק — כך המסך אינו תלוי בקובץ חיצוני
 * שיכול להשתנות או להיחסם, והוא נראה אותו דבר בכל גודל מסך.
 */
export function BankMark({ info, size = 44 }: { info: PreApprovalBankInfo; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-2xl font-black text-white shadow-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: info.color,
        fontSize: Math.round(size * 0.38),
        letterSpacing: '-0.02em',
      }}
    >
      {info.initials}
    </span>
  );
}
