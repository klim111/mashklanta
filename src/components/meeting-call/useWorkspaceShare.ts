'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { ScreenSharePresets, Track } from 'livekit-client';

/**
 * שיתוף החלון של הביקור הווירטואלי או של תיק הלקוח — ורק אותו.
 *
 * הדפדפן משתף את הלשונית הנוכחית (`preferCurrentTab`), ומיד חותך את התמונה
 * לחלון של הפלטפורמה: Element Capture (`restrictTo`), שמצלם רק את האלמנט גם
 * כשמשהו מכסה אותו, ואם אינו נתמך — Region Capture (`cropTo`), שחותך לאזור
 * שלו. כך הלקוח רואה את הפלטפורמה, ולא את מסך השיחה ואת אזור היועץ. שתי
 * היכולות קיימות בכרום ובאדג' במחשב; בדפדפן אחר משותפת הלשונית כולה, והמסך
 * אומר את זה.
 */

interface CaptureTargetApi {
  fromElement(element: Element): Promise<unknown>;
}

type CapturableTrack = MediaStreamTrack & {
  restrictTo?: (target: unknown) => Promise<void>;
  cropTo?: (target: unknown) => Promise<void>;
};

export type ShareScope = 'element' | 'region' | 'tab';

export function useWorkspaceShare() {
  const { localParticipant } = useLocalParticipant();
  const [sharing, setSharing] = useState(false);
  const [scope, setScope] = useState<ShareScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const stop = useCallback(async () => {
    const track = trackRef.current;
    trackRef.current = null;
    setSharing(false);
    setScope(null);
    if (!track) return;
    try {
      await localParticipant.unpublishTrack(track);
    } catch {
      /* כבר הוסר */
    }
    track.stop();
  }, [localParticipant]);

  const start = useCallback(
    async (element: HTMLElement | null) => {
      setError(null);
      if (!element) return;
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError('הדפדפן הזה לא מאפשר לשתף מסך. נסו בכרום או באדג׳ במחשב');
        return;
      }
      await stop();
      // שיתוף מסך רגיל שכבר פעיל מתחלף בשיתוף של החלון
      if (localParticipant.isScreenShareEnabled) await localParticipant.setScreenShareEnabled(false).catch(() => undefined);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 15 },
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'exclude',
        } as DisplayMediaStreamOptions);
      } catch {
        setError('השיתוף לא התחיל. כדי לשתף, בחרו בחלון הדפדפן את "הלשונית הזו"');
        return;
      }
      const track = stream.getVideoTracks()[0] as CapturableTrack | undefined;
      if (!track) return;

      let nextScope: ShareScope = 'tab';
      const win = window as unknown as { RestrictionTarget?: CaptureTargetApi; CropTarget?: CaptureTargetApi };
      try {
        if (win.RestrictionTarget && track.restrictTo) {
          await track.restrictTo(await win.RestrictionTarget.fromElement(element));
          nextScope = 'element';
        }
      } catch {
        /* האלמנט לא מתאים ל-Element Capture — ננסה חיתוך */
      }
      if (nextScope === 'tab') {
        try {
          if (win.CropTarget && track.cropTo) {
            await track.cropTo(await win.CropTarget.fromElement(element));
            nextScope = 'region';
          }
        } catch {
          /* נבחר מסך אחר ולא הלשונית הזו — משותף כמו שהוא */
        }
      }

      track.addEventListener('ended', () => void stop());
      trackRef.current = track;
      try {
        await localParticipant.publishTrack(track, {
          source: Track.Source.ScreenShare,
          screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
          simulcast: false,
        });
      } catch {
        trackRef.current = null;
        track.stop();
        setError('לא הצלחנו לשתף את המסך. בדקו את החיבור ונסו שוב');
        return;
      }
      setScope(nextScope);
      setSharing(true);
    },
    [localParticipant, stop]
  );

  // יציאה מהשיחה או סגירת החלון — השיתוף נעצר
  useEffect(
    () => () => {
      trackRef.current?.stop();
    },
    []
  );

  return { sharing, scope, error, start, stop, clearError: () => setError(null) };
}
