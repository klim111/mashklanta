'use client';

import { useCallback, useEffect, useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { CalendarDays, Clock, Loader2, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import '@livekit/components-styles';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import type { GuestMeetingPublic } from '@/lib/guest-meetings';
import { CallStage } from './CallStage';
import { deviceIssueMessage, prepareDevices } from './devices';
import { ChoiceToggle, FAILURE_ERRORS, ROOM_OPTIONS } from './MeetingCallScreen';
import type { MeetingCallDetails } from './types';

type Phase =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'lobby' }
  | { kind: 'joining' }
  | { kind: 'in-call'; token: string; serverUrl: string }
  | { kind: 'left' };

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * מסך הפגישה של האורח, מהלינק החד-פעמי (src/lib/guest-meetings.ts).
 *
 * האורח לא רואה שום חלק אחר של הפלטפורמה: רק את הפגישה — וידאו, צ'אט, תיק
 * מסמכים לדוגמה וכפתור "פעולות וכלים". לפני המועד מוצגת ספירה לאחור, ואחרי
 * תשעים דקות הלינק פג: השיחה נסגרת, וכל מה שהוזן בה נעלם מהדפדפן.
 */
export function GuestMeetingScreen({ token }: { token: string }) {
  const [meeting, setMeeting] = useState<GuestMeetingPublic | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [name, setName] = useState('');
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [deviceIssue, setDeviceIssue] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const now = useNow(1000);

  const load = useCallback(async () => {
    const response = await fetch(`/api/guest-meeting/${encodeURIComponent(token)}`, { cache: 'no-store' }).catch(() => null);
    const body = await response?.json().catch(() => null);
    if (!response?.ok || !body) {
      setPhase({ kind: 'invalid', message: body?.error ?? 'לא הצלחנו לטעון את הפגישה' });
      return;
    }
    setMeeting(body as GuestMeetingPublic);
    setName((current) => current || (body as GuestMeetingPublic).guestName || '');
    setPhase((current) => (current.kind === 'loading' ? { kind: 'lobby' } : current));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const startsAt = meeting ? new Date(meeting.startsAt).getTime() : 0;
  const endsAt = meeting ? new Date(meeting.endsAt).getTime() : 0;
  const cancelled = meeting?.state === 'cancelled';
  const early = Boolean(meeting) && !cancelled && now < startsAt;
  const expired = Boolean(meeting) && !cancelled && now >= endsAt;

  // הלינק פג באמצע השיחה — השיחה נסגרת, וכל מה שהיה בה נעלם
  useEffect(() => {
    if (expired && (phase.kind === 'in-call' || phase.kind === 'joining')) setPhase({ kind: 'left' });
  }, [expired, phase.kind]);

  const join = useCallback(async () => {
    if (!name.trim()) {
      setJoinError('כתבו את השם שלכם');
      return;
    }
    setJoinError(null);
    setPhase({ kind: 'joining' });
    const devices = await prepareDevices(mic, camera);
    setMic(devices.mic);
    setCamera(devices.camera);
    setDeviceIssue(devices.issue);
    const response = await fetch(`/api/guest-meeting/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    if (!response?.ok || !body?.token) {
      setJoinError(body?.error ?? 'לא הצלחנו להתחבר לשיחה. בדקו את החיבור ונסו שוב');
      setPhase({ kind: 'lobby' });
      return;
    }
    setPhase({ kind: 'in-call', token: body.token, serverUrl: body.serverUrl });
  }, [token, name, mic, camera]);

  if (phase.kind === 'in-call' && meeting && !expired) {
    const details: MeetingCallDetails = {
      kind: 'guest',
      meetingId: token,
      title: meeting.title,
      startsAt: meeting.startsAt,
      durationMinutes: Math.round((endsAt - startsAt) / 60000),
      status: 'CONFIRMED',
      role: 'CLIENT',
      advisorName: meeting.advisorName,
      clientName: name.trim(),
      clientId: '',
      clientUserId: '',
      planId: null,
      configured: true,
      endsAt: meeting.endsAt,
      guestState: 'open',
    };
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
        onDisconnected={() => setPhase({ kind: 'left' })}
        onMediaDeviceFailure={(failure, kind) =>
          setDeviceIssue(
            deviceIssueMessage(kind === 'audioinput' ? 'mic' : 'camera', failure ? FAILURE_ERRORS[failure] : undefined)
          )
        }
        onError={(error) => console.error('[guest-meeting]', error)}
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

        {phase.kind === 'invalid' && <p className="py-6 text-center text-lg font-black">{phase.message}</p>}

        {meeting && phase.kind !== 'loading' && phase.kind !== 'invalid' && (
          <>
            <p className="text-sm font-bold text-white/60">פגישת וידאו עם {meeting.advisorName}</p>
            <h1 className="mt-1 text-2xl font-black text-white">{meeting.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
              <CalendarDays className="h-4 w-4" />
              {formatDate(meeting.startsAt)} · {formatTime(meeting.startsAt)} עד {formatTime(meeting.endsAt)}
            </p>

            {cancelled ? (
              <p className="mt-6 rounded-xl bg-rose-400/15 p-3 text-sm font-bold text-rose-100">הפגישה בוטלה.</p>
            ) : expired ? (
              <p className="mt-6 rounded-xl bg-rose-400/15 p-3 text-sm font-bold text-rose-100">
                הפגישה הסתיימה והלינק פג. שום דבר שהוזן בפגישה לא נשמר.
              </p>
            ) : !meeting.configured ? (
              <p className="mt-6 rounded-xl bg-amber-400/15 p-3 text-sm font-bold text-amber-100">
                שיחות הווידאו עוד לא הוגדרו באתר. נסו שוב מאוחר יותר.
              </p>
            ) : early ? (
              <div className="mt-6 rounded-2xl bg-white/10 p-4 text-center">
                <p className="flex items-center justify-center gap-2 text-sm font-bold text-white/70">
                  <Clock className="h-4 w-4" />
                  הפגישה תיפתח בעוד
                </p>
                <p className="mt-1 text-4xl font-black tabular-nums">{countdown(startsAt - now)}</p>
                <p className="mt-2 text-xs text-white/55">אפשר להשאיר את הדף פתוח. הכניסה תיפתח מעצמה במועד.</p>
              </div>
            ) : (
              <>
                {phase.kind === 'left' && <p className="mt-6 text-sm font-bold text-white/70">יצאתם מהשיחה.</p>}
                <label className="mt-6 block text-sm font-bold text-white/80">
                  השם שלכם
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/90 px-3.5 py-2.5 text-base text-slate-900 outline-none"
                    maxLength={60}
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2">
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
                {joinError && <p className="mt-3 rounded-xl bg-rose-400/15 p-2.5 text-sm font-bold text-rose-100">{joinError}</p>}
                <button
                  type="button"
                  disabled={phase.kind === 'joining'}
                  onClick={() => void join()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-base font-black text-white shadow-lg hover:bg-emerald-600 disabled:opacity-60"
                >
                  {phase.kind === 'joining' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
                  {phase.kind === 'left' ? 'חזרה לשיחה' : 'הצטרפות לשיחה'}
                </button>
                <p className="mt-3 text-center text-xs text-white/55">
                  הלינק תקף עד {formatTime(meeting.endsAt)}. בשיחה יש צ׳אט, תיק מסמכים וכלים לזמן הפגישה. שום דבר שתזינו לא
                  נשמר אחריה.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
