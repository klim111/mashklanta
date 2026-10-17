'use client';

import { useState } from 'react';
import { FolderOpen, MessageSquare, Mic, MonitorUp, PhoneOff, Presentation, StopCircle, Video, X } from 'lucide-react';
import { formatTime } from '@/lib/advisor-crm';
import { ChatPane } from '@/components/conversation/ChatPane';
import { demoId } from '@/demo/demo-attr';
import { CallDocumentsPanel } from './CallDocumentsPanel';
import type { MeetingCallDetails, PresentedDocument } from './types';

type Panel = 'chat' | 'documents' | null;

/**
 * מסך שיחת הווידאו בהדגמה. אותו מבנה כמו CallStage — התמונות, שיתוף המסך,
 * הצ'אט ותיק המסמכים של השיחה — בלי חדר LiveKit אמיתי: במקום המצלמות מוצגים
 * כרטיסי המשתתפים, והמסך המשותף והמסמך המוצג הם דוגמה.
 */
export function DemoCallStage({ details }: { details: MeetingCallDetails }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [sharing, setSharing] = useState(false);
  const [presented, setPresented] = useState<PresentedDocument | null>(null);
  const [chatSignal, setChatSignal] = useState(0);

  const togglePanel = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));
  const tiles = [
    { name: details.advisorName, initials: 'ר', tone: 'from-blue-600 to-indigo-700', speaking: true },
    { name: `${details.clientName} (אתם)`, initials: 'ד', tone: 'from-emerald-600 to-teal-700', speaking: false },
  ];
  const focus = presented ?? (sharing ? 'share' : null);

  return (
    <div dir="rtl" className="flex h-[100dvh] flex-col bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{details.title}</p>
          <p className="text-xs text-white/60">
            בשיחה עם {details.advisorName} · נקבעה ל-{formatTime(details.startsAt)}
          </p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 gap-3 p-3">
          {focus ? (
            <>
              <div className="min-w-0 flex-1" {...demoId('call-focus')}>
                {focus === 'share' ? (
                  <SharedScreen by={details.clientName} />
                ) : (
                  <PresentedView doc={focus as PresentedDocument} onStop={() => setPresented(null)} />
                )}
              </div>
              <div className="flex w-56 shrink-0 flex-col gap-3">
                {tiles.map((tile) => (
                  <Tile key={tile.name} {...tile} small />
                ))}
              </div>
            </>
          ) : (
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
              {tiles.map((tile) => (
                <Tile key={tile.name} {...tile} />
              ))}
            </div>
          )}
        </div>

        {panel && (
          <aside className="flex w-[380px] min-w-0 flex-col border-r border-white/10 bg-white text-right text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <div className="flex gap-1">
                <PanelTab active={panel === 'chat'} onClick={() => setPanel('chat')}>
                  צ׳אט
                </PanelTab>
                <PanelTab active={panel === 'documents'} onClick={() => setPanel('documents')}>
                  תיק המסמכים
                </PanelTab>
              </div>
              <button
                type="button"
                aria-label="סגירת החלונית"
                onClick={() => setPanel(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={`min-h-0 flex-1 flex-col ${panel === 'chat' ? 'flex' : 'hidden'}`}>
              <ChatPane role="CLIENT" inCall refreshSignal={chatSignal} />
            </div>
            <div className={`min-h-0 flex-1 flex-col ${panel === 'documents' ? 'flex' : 'hidden'}`}>
              <CallDocumentsPanel
                details={details}
                refreshSignal={0}
                presentingId={presented?.id ?? null}
                onPresent={(doc) => {
                  setSharing(false);
                  setPresented({ ...doc, by: details.clientName });
                }}
                onChanged={() => undefined}
                onSentToChat={() => setChatSignal((value) => value + 1)}
              />
            </div>
          </aside>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-3">
        <CallButton active>
          <Mic className="h-4 w-4" />
          מיקרופון
        </CallButton>
        <CallButton active>
          <Video className="h-4 w-4" />
          מצלמה
        </CallButton>
        <CallButton
          active={sharing}
          onClick={() => {
            setPresented(null);
            setSharing((value) => !value);
          }}
        >
          <MonitorUp className="h-4 w-4" />
          {sharing ? 'הפסקת שיתוף' : 'שיתוף מסך'}
        </CallButton>
        <CallButton active={panel === 'chat'} onClick={() => togglePanel('chat')}>
          <MessageSquare className="h-4 w-4" />
          צ׳אט
        </CallButton>
        <CallButton active={panel === 'documents'} onClick={() => togglePanel('documents')}>
          <FolderOpen className="h-4 w-4" />
          תיק המסמכים
        </CallButton>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-700"
        >
          <PhoneOff className="h-4 w-4" />
          יציאה
        </button>
      </footer>
    </div>
  );
}

function Tile({ name, initials, tone, speaking, small = false }: { name: string; initials: string; tone: string; speaking: boolean; small?: boolean }) {
  return (
    <div
      className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${tone} ${
        speaking ? 'ring-4 ring-emerald-400/80' : ''
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-white/20 font-black text-white ${
          small ? 'h-16 w-16 text-3xl' : 'h-40 w-40 text-7xl'
        } ${speaking ? 'animate-pulse' : ''}`}
      >
        {initials}
      </span>
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-lg bg-black/45 px-2.5 py-1 text-xs font-bold">
        <Mic className="h-3.5 w-3.5" />
        {name}
      </span>
    </div>
  );
}

/** המסך שהלקוח משתף: התמהילים שלו, להשוואה יחד עם היועץ */
function SharedScreen({ by }: { by: string }) {
  const mixes = [
    { name: 'תמהיל א׳', payment: '6,840 ₪', total: '1.98 מ׳ ₪', bars: [40, 35, 25] },
    { name: 'תמהיל ב׳', payment: '7,120 ₪', total: '1.91 מ׳ ₪', bars: [33, 34, 33] },
    { name: 'תמהיל ג׳', payment: '6,510 ₪', total: '2.06 מ׳ ₪', bars: [50, 30, 20] },
  ];
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white text-slate-900">
      <p className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm font-black">
        <MonitorUp className="h-4 w-4 text-blue-600" />
        {by} משתפים את המסך
      </p>
      <div className="min-h-0 flex-1 bg-slate-50 p-5" {...demoId('call-share-body')}>
        <p className="mb-4 text-lg font-black">השוואת תמהילים</p>
        <div className="grid grid-cols-3 gap-4">
          {mixes.map((mix) => (
            <div key={mix.name} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-black">{mix.name}</p>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                {mix.bars.map((value, i) => (
                  <span key={i} className={colors[i]} style={{ width: `${value}%` }} />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">החזר חודשי</p>
              <p className="text-xl font-black">{mix.payment}</p>
              <p className="mt-2 text-xs text-slate-500">סך כל ההחזרים</p>
              <p className="text-lg font-black">{mix.total}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** מסמך מהתיק שמוצג לשני הצדדים. בהדגמה הקבצים הם דוגמה, ולכן מוצג עמוד לדוגמה */
function PresentedView({ doc, onStop }: { doc: PresentedDocument; onStop: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white text-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-black">
          <Presentation className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="truncate">{doc.name}</span>
          <span className="shrink-0 text-xs font-bold text-slate-500">· אתם מציגים</span>
        </p>
        <button
          type="button"
          onClick={onStop}
          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-black text-white hover:bg-rose-700"
        >
          <StopCircle className="h-3.5 w-3.5" />
          הפסקת הצגה
        </button>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-hidden bg-slate-100 p-4" {...demoId('call-present-body')}>
        <div className="aspect-[0.707] h-full max-w-full rounded bg-white p-6 shadow-lg">
          <p className="text-lg font-black">{doc.name}</p>
          <p className="mt-1 text-xs text-slate-500">{doc.fileName} · מסמך לדוגמה</p>
          <div className="mt-5 space-y-2.5">
            {[92, 80, 86, 64, 90, 72, 84, 58, 88, 76].map((width, i) => (
              <span key={i} className="block h-2.5 rounded bg-slate-200" style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-black transition-colors ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function CallButton({ active, onClick, children }: { active: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-colors ${
        active ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white/5 text-white/70 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
