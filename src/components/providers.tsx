'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { MotionConfig } from 'framer-motion';
import { useA11yPrefs } from '@/components/a11y/a11yStore';
import { attachNumericCaretFix } from '@/lib/caret';
import { useDemoRequest } from '@/demo/store';
import { demoSession } from '@/demo/data/demo-session';
import { DemoHost } from '@/demo/DemoHost';
import { PhoneGate } from '@/components/device/PhoneGate';
import { ClientConversationProvider } from '@/components/conversation/ClientChatDock';
import { SiteVisitTracker } from '@/components/analytics/SiteVisitTracker';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { NewMeetingAlert } from '@/components/meetings/NewMeetingAlert';
import { AdvisorActionsMenu } from '@/components/actions/AdvisorActionsMenu';
import { AdvisorTabGuard } from '@/components/auth/AdvisorTabGuard';
import { ClientViewBar } from '@/components/client-view/ClientViewBar';
import { activateSessionGuard } from '@/demo/sandbox/session-guard';
import { installFrameMode } from '@/components/frame-mode/frameMode';
import { FrameModeBanner } from '@/components/frame-mode/FrameModeBanner';
import { FrameToolsMenu } from '@/components/frame-mode/FrameToolsMenu';

/**
 * החלונות של הפגישות — הביקור הווירטואלי, הכלים של האורח ותיק לקוח מתעניין
 * (src/components/frame-mode/frameMode.ts). ההתקנה כאן, בטעינת המודול, כדי
 * שתקדים את הבקשה הראשונה של ספק ה-session.
 */
installFrameMode(activateSessionGuard);

export function Providers({ children }: { children: React.ReactNode }) {
  // בכל שדה מספרי בפלטפורמה הסמן נכנס בסוף הערך, כדי שמחיקה תעבוד מיד
  useEffect(() => attachNumericCaretFix(), []);

  /**
   * בזמן הדגמה ה-session הוא הפרסונה הבדויה: הספק מורכב מחדש עם session קבוע,
   * ולא פונה לשרת — וכל מסך "מחובר" רואה את משפחת ההדגמה במקום משתמש אמיתי.
   */
  const demo = useDemoRequest();

  // "עצירת אנימציות" בתפריט הנגישות עוצרת גם את האנימציות של framer-motion
  const { stopMotion } = useA11yPrefs();

  return (
    <SessionProvider
      key={demo ? 'demo' : 'live'}
      session={demo ? demoSession() : undefined}
      refetchOnWindowFocus={!demo}
    >
      <MotionConfig reducedMotion={stopMotion ? 'always' : 'user'}>
        {/* הכניסה של היועץ לא נשמרת: ביקור חדש מנתק אותו לפני שמשהו מוצג */}
        <AdvisorTabGuard>
          <DemoHost>
            <SiteVisitTracker />
            <GoogleAnalytics />
            <FrameModeBanner />
            <PhoneGate>
              {/* ההתכתבות עם היועץ */}
              <ClientConversationProvider>{children}</ClientConversationProvider>
              {/* פגישה שהיועץ קבע — התראה צפה בכל מסך של הלקוח */}
              <NewMeetingAlert />
              {/* הפעולות המהירות של היועץ — בונה התמהילים וכלי הלקוח מכל עמוד */}
              <AdvisorActionsMenu />
              {/* היועץ מחוץ לאזור היועץ — מצב יועץ (או "כלקוח"), וחזרה לאזור היועץ מכל מסך */}
              <ClientViewBar />
              {/* חלונות הפגישה: גישה מהירה לכל הכלים */}
              <FrameToolsMenu />
            </PhoneGate>
          </DemoHost>
        </AdvisorTabGuard>
      </MotionConfig>
    </SessionProvider>
  );
}
