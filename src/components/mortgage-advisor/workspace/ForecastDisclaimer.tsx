'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { mixHasForecastSensitiveTracks } from '../engine';
import type { WorkspaceMix } from '../engine';

export const FORECAST_DISCLAIMER =
  'כל החישובים והמספרים במסלולים משתנים או צמודי מדד מבוססים על תחזיות ריבית ומדד עתידיים של בנק ישראל, אינם מדויקים ועשויים להשתנות בהתאם לשינויים הריאליים של ערכים אלו בעתיד.';

interface ForecastDisclaimerProps {
  mix: Pick<WorkspaceMix, 'tracks'>;
  className?: string;
  compact?: boolean;
}

/** הבהרה שמוצגת בכל תמהיל שיש בו מסלול משתנה או צמוד מדד */
export function ForecastDisclaimer({ mix, className = '', compact = false }: ForecastDisclaimerProps) {
  if (!mixHasForecastSensitiveTracks(mix)) return null;

  return (
    <p
      className={`flex items-start gap-1.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug ${className}`}
    >
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
      {compact
        ? 'המספרים במסלולים משתנים וצמודים מבוססים על תחזיות ריבית ומדד של בנק ישראל, אינם מדויקים ועשויים להשתנות.'
        : FORECAST_DISCLAIMER}
    </p>
  );
}
