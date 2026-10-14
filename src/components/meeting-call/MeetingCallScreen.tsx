'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LiveKitRoom } from '@livekit/components-react';
import { ScreenSharePresets, VideoPresets } from 'livekit-client';
import type { RoomOptions } from 'livekit-client';
import { ArrowRight, CalendarDays, Loader2, Mic, MicOff, RotateCcw, Video, VideoOff } from 'lucide-react';
import '@livekit/components-styles';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import { CallStage } from './CallStage';
import { returnHref } from './types';
import type { MeetingCallDetails } from './types';

/**
 * הגדרות החדר: עד 720p, שזה מספיק לפגישת ייעוץ וחוסך תעבורה; שלוש שכבות
 * איכות (simulcast), כך שהשרת שולח לכל צד את מה שהרשת שלו מחזיקה ולא מקפיא
 * את שניהם בגלל אחד; ותמונה שנשלחת רק כשמישהו באמת צופה בה (dynacast).
 */
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  disconnectOnPageLeave: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    videoEncoding: VideoPresets.h720.encoding,
    screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
    red: true,
    dtx: true,
  },
};

type Phase =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'lobby' }
  | { kind: 'joining' }
  | { kind: 'in-call'; token: string; serverUrl: string }
  | { kind: 'ended' };

/**
 * מסך שיחת הווידאו של פגישה: לובי עם פרטי הפגישה ובחירה אם להיכנס עם מצלמה
 * ומיקרופון, השיחה עצמה, ומסך סיום עם חזרה או כניסה מחדש.
 */
export function MeetingCallScreen({ meetingId }: { meetingId: string }) {
  const [details, setDetails] = useState<MeetingCallDetails | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [deviceIssue, setDeviceIssue] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const response = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/call`, { cache: 'no-store' }).catch(
        () => null
      );
      const body = await response?.json().catch(() => null);
      if (!alive) return;
      if (!response?.ok || !body) {
        setPhase({ kind: 'failed', message: body?.error ?? 'לא הצלחנו לטעון את הפגישה' });
        return;
      }
      setDetails(body as MeetingCallDetails);
      setPhase({ kind: 'lobby' });
    })();
    return () => {
      alive = false;
    };
  }, [meetingId]);

  const join = useCallback(async () => {
    setPhase({ kind: 'joining' });
    setDeviceIssue(null);
    const response = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/call`, { method: 'POST' }).catch(
      () => null
    );
    const body = await response?.json().catch(() => null);
    if (!response?.ok || !body?.token) {
      setPhase({ kind: 'failed', message: body?.error ?? 'לא הצלחנו להתחבר לשיחה. בדקו את החיבור ונסו שוב' });
      return;
    }
    setPhase({ kind: 'in-call', token: body.token, serverUrl: body.serverUrl });
  }, [meetingId]);

  if (phase.kind === 'in-call' && details) {
    return (
      <LiveKitRoom
        serverUrl={phase.serverUrl}
        token={phase.token}
        connect
        audio={mic}
        video={camera}
        options={ROOM_OPTIONS}
        data-lk-theme="default"
        className="h-[100dvh] w-full"
        onDisconnected={() => setPhase({ kind: 'ended' })}
        onMediaDeviceFailure={(_failure, kind) =>
          setDeviceIssue(
            kind === 'audioinput'
              ? 'לא הצלחנו להפעיל את המיקרופון. בדקו שהדפדפן מורשה להשתמש בו.'
              : 'לא הצלחנו להפעיל את המצלמה. בדקו שהדפדפן מורשה להשתמש בה ושאין תוכנה אחרת שתופסת אותה.'
          )
        }
        onError={(error) => console.error('[meeting-call]', error)}
      >
        <CallStage details={details} deviceIssue={deviceIssue} onDismissDeviceIssue={() => setDeviceIssue(null)} />
      </LiveKitRoom>
    );
  }

  return (
    <main dir="rtl" className="flex min-h-[100dvh] items-center justify-center bg-brand-dark px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 md:p-8">
        {phase.kind === 'loading' && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        )}

        {phase.kind === 'failed' && (
          <div className="text-center">
            <p className="text-lg font-black">{phase.message}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {details && (
                <button
                  type="button"
                  onClick={() => setPhase({ kind: 'lobby' })}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-black hover:bg-white/25"
                >
                  <RotateCcw className="h-4 w-4" />
                  ניסיון נוסף
                </button>
              )}
              <BackLink details={details} />
            </div>
          </div>
        )}

        {details && (phase.kind === 'lobby' || phase.kind === 'joining' || phase.kind === 'ended') && (
          <>
            <p className="text-sm font-bold text-white/60">
              {phase.kind === 'ended' ? 'השיחה הסתיימה' : 'פגישת וידאו'}
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">{details.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
              <CalendarDays className="h-4 w-4" />
              {formatDate(details.startsAt)} · {formatTime(details.startsAt)} · {details.durationMinutes} דק׳
            </p>
            <p className="mt-1 text-sm text-white/75">
              {details.role === 'ADVISOR' ? `עם ${details.clientName}` : `עם ${details.advisorName}`}
            </p>

            {!details.configured ? (
              <p className="mt-6 rounded-xl bg-amber-400/15 p-3 text-sm font-bold text-amber-100">
                שיחות הווידאו עוד לא הוגדרו באתר. {details.role === 'ADVISOR' ? 'צריך להוסיף את משתני LIVEKIT ב-Vercel.' : 'נסו שוב מאוחר יותר.'}
              </p>
            ) : details.status === 'CANCELLED' || details.status === 'DECLINED' ? (
              <p className="mt-6 rounded-xl bg-rose-400/15 p-3 text-sm font-bold text-rose-100">
                הפגישה בוטלה, ולכן אי אפשר להיכנס לשיחה.
              </p>
            ) : (
              <>
                {phase.kind !== 'ended' && (
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <ChoiceToggle
                      on={mic}
                      onChange={setMic}
                      onIcon={<Mic className="h-4 w-4" />}
                      offIcon={<MicOff className="h-4 w-4" />}
                      onLabel="מיקרופון פעיל"
                      offLabel="מיקרופון כבוי"
                    />
                    <ChoiceToggle
                      on={camera}
                      onChange={setCamera}
                      onIcon={<Video className="h-4 w-4" />}
                      offIcon={<VideoOff className="h-4 w-4" />}
                      onLabel="מצלמה פעילה"
                      offLabel="מצלמה כבויה"
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={phase.kind === 'joining'}
                  onClick={() => void join()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-base font-black text-white shadow-lg transition-colors hover:bg-emerald-600 disabled:opacity-60"
                >
                  {phase.kind === 'joining' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
                  {phase.kind === 'ended' ? 'הצטרפות מחדש' : 'הצטרפות לשיחה'}
                </button>
                {phase.kind !== 'ended' && (
                  <p className="mt-3 text-center text-xs text-white/55">
                    הדפדפן יבקש אישור להשתמש במצלמה ובמיקרופון. בשיחה אפשר לשתף מסך, לכתוב בצ׳אט ולפתוח את תיק
                    המסמכים.
                  </p>
                )}
              </>
            )}

            <div className="mt-6 flex justify-center">
              <BackLink details={details} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function BackLink({ details }: { details: MeetingCallDetails | null }) {
  const href = details ? returnHref(details) : '/';
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-black text-white/80 hover:bg-white/10 hover:text-white"
    >
      <ArrowRight className="h-4 w-4" />
      {details?.role === 'ADVISOR' ? 'חזרה לכרטיס הלקוח' : 'חזרה לאזור האישי'}
    </Link>
  );
}

function ChoiceToggle({
  on,
  onChange,
  onIcon,
  offIcon,
  onLabel,
  offLabel,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition-colors ${
        on ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-rose-500/25 text-rose-100 hover:bg-rose-500/35'
      }`}
    >
      {on ? onIcon : offIcon}
      {on ? onLabel : offLabel}
    </button>
  );
}
