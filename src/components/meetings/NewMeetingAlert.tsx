'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck2, CalendarDays, Clock, MapPin, X } from 'lucide-react';
import { formatDate, formatTime, meetingAwaits, relativeDayLabel } from '@/lib/advisor-crm';
import { meetingAlertKey, pendingMeetingAlerts } from '@/lib/meeting-alerts';
import { useMeetings } from '@/components/advisor/useAdvisorCrm';

const STORAGE_KEY = 'mk-seen-meeting-alerts';
/** כמה מפתחות נשמרים — מספיק לכל הפגישות שעוד רלוונטיות */
const MAX_SEEN = 200;
/** כמה זמן נשארת ההודעה "הפגישה זמינה ביומן" אחרי הסגירה */
const CLOSED_NOTE_MS = 5000;

/** מסכים שאין בהם התראה: אזור היועץ, ההתחברות ושיחת הווידאו עצמה */
const HIDDEN_PREFIXES = ['/advisor', '/auth', '/meeting/'];

function readSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen].slice(-MAX_SEEN)));
  } catch {
    // בלי אחסון בדפדפן ההתראה פשוט תופיע שוב בכניסה הבאה
  }
}

/**
 * התראה צפה בתחתית כל מסך של הלקוח, כשהיועץ קבע לו פגישה.
 *
 * הפגישות נטענות ברקע (אותו רענון חי של כל הפגישות), כך שפגישה חדשה מופיעה
 * תוך שניות בכל עמוד שהלקוח נמצא בו. בסגירה ההתראה מזכירה שהפגישה זמינה
 * בלוח השנה ובאזור "הפגישות שלי", ולא חוזרת — אלא אם היועץ שינה את המועד.
 */
export function NewMeetingAlert() {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '/';
  const enabled =
    status === 'authenticated' &&
    session?.user?.role !== 'ADVISOR' &&
    !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const { meetings } = useMeetings({ enabled });
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [closedNote, setClosedNote] = useState(false);

  useEffect(() => setSeen(readSeen()), []);

  useEffect(() => {
    if (!closedNote) return;
    const timer = window.setTimeout(() => setClosedNote(false), CLOSED_NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [closedNote]);

  const pending = enabled && seen ? pendingMeetingAlerts(meetings, seen) : [];
  const meeting = pending[0] ?? null;

  const dismiss = useCallback(() => {
    if (!meeting || !seen) return;
    const next = new Set(seen);
    next.add(meetingAlertKey(meeting));
    writeSeen(next);
    setSeen(next);
    setClosedNote(true);
  }, [meeting, seen]);

  if (!enabled) return null;
  const awaitsMe = meeting ? meetingAwaits(meeting, 'CLIENT') : false;

  return (
    <div
      dir="rtl"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center print:hidden sm:bottom-5"
    >
      <AnimatePresence mode="wait">
        {meeting && !closedNote ? (
          <motion.div
            key={meetingAlertKey(meeting)}
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-4 text-right shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <CalendarCheck2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-slate-900">
                  {awaitsMe ? 'היועץ הציע לך פגישה' : 'נקבעה לך פגישה'}
                </p>
                <p className="truncate text-sm font-bold text-slate-700">{meeting.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {relativeDayLabel(meeting.startsAt)}, {formatDate(meeting.startsAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(meeting.startsAt)} · {meeting.durationMinutes} דק׳
                  </span>
                  {meeting.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {meeting.location}
                    </span>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href="/dashboard#meetings"
                    onClick={dismiss}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-black text-white hover:bg-emerald-700"
                  >
                    {awaitsMe ? 'לאישור הפגישה' : 'לפגישות שלי'}
                  </Link>
                  {pending.length > 1 && (
                    <span className="text-xs font-bold text-slate-500">ועוד {pending.length - 1} פגישות חדשות</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="סגירת ההתראה"
                onClick={dismiss}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : closedNote ? (
          <motion.div
            key="closed"
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-2xl"
          >
            <CalendarCheck2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="min-w-0 flex-1">הפגישה זמינה בלוח השנה ובאזור &quot;הפגישות שלי&quot;.</span>
            <Link href="/dashboard#meetings" className="shrink-0 text-emerald-300 underline-offset-2 hover:underline">
              לפגישות
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
