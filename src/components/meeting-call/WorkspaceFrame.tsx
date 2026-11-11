'use client';

import { useEffect, useRef } from 'react';
import { FolderOpen, Loader2, MonitorPlay, MonitorUp, MonitorX, RotateCcw, X } from 'lucide-react';
import { VISIT_FRAME_NAME, actFrameName, actFrameUrl } from '@/components/frame-mode/frameMode';
import { useWorkspaceShare } from './useWorkspaceShare';

export type Workspace = { kind: 'visit' } | { kind: 'client'; clientId: string; name?: string };

/**
 * החלון של היועץ בשיחה: הביקור הווירטואלי בפלטפורמה (מצב הדגמה), או תיק
 * הלקוח המתעניין שנפתח בפגישה. החלון הוא הפלטפורמה עצמה, כמו שלקוח רשום רואה
 * אותה (src/components/frame-mode/frameMode.ts), והשיתוף משדר ללקוח רק אותו.
 */
export function WorkspaceFrame({
  workspace,
  autoShare,
  onClose,
  onSwitch,
}: {
  workspace: Workspace;
  /** לשתף מיד כשהחלון נפתח — הלחיצה על הכפתור היא האישור */
  autoShare: boolean;
  onClose: () => void;
  onSwitch?: (next: Workspace) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const { sharing, scope, error, start, stop, clearError } = useWorkspaceShare();
  const started = useRef(false);

  useEffect(() => {
    if (!autoShare || started.current) return;
    started.current = true;
    void start(holder.current);
  }, [autoShare, start]);

  const visit = workspace.kind === 'visit';
  const name = visit ? VISIT_FRAME_NAME : actFrameName(workspace.clientId);
  const src = visit ? '/demo/dashboard' : actFrameUrl(workspace.clientId);

  const close = async () => {
    await stop();
    onClose();
  };

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-black">
          {visit ? (
            <MonitorPlay className="h-4 w-4 shrink-0 text-violet-600" />
          ) : (
            <FolderOpen className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span className="truncate">
            {visit ? 'ביקור וירטואלי בפלטפורמה · הדגמה' : `תיק לקוח${workspace.name ? `: ${workspace.name}` : ''}`}
          </span>
          {sharing && (
            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-2xs font-black text-rose-700">
              ● משותף ללקוח{scope === 'tab' ? ' (כל הלשונית)' : ''}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => frame.current?.contentWindow?.location.reload()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
            title="רענון החלון"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          {onSwitch && !visit && (
            <button
              type="button"
              onClick={() => onSwitch({ kind: 'visit' })}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-violet-700 hover:bg-violet-50"
            >
              <MonitorPlay className="h-3.5 w-3.5" />
              להדגמה
            </button>
          )}
          {sharing ? (
            <button
              type="button"
              onClick={() => void stop()}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-black text-white hover:bg-rose-700"
            >
              <MonitorX className="h-3.5 w-3.5" />
              הפסקת שיתוף
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void start(holder.current)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white hover:bg-emerald-700"
            >
              <MonitorUp className="h-3.5 w-3.5" />
              שיתוף ללקוח
            </button>
          )}
          <button
            type="button"
            onClick={() => void close()}
            aria-label="סגירת החלון"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && (
        <div className="flex items-center justify-between gap-2 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="סגירה" className="rounded p-0.5 hover:bg-amber-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {sharing && scope === 'tab' && (
        <p className="bg-amber-50 px-3 py-1 text-2xs font-bold text-amber-800">
          הדפדפן הזה משתף את כל הלשונית, כולל מסך השיחה. בכרום או באדג׳ משותף רק חלון הפלטפורמה.
        </p>
      )}
      {/* Element Capture דורש הקשר ערימה משלו (isolation) */}
      <div ref={holder} className="relative min-h-0 flex-1 bg-slate-100" style={{ isolation: 'isolate' }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <iframe
          key={name}
          ref={frame}
          name={name}
          src={src}
          title={visit ? 'ביקור וירטואלי' : 'תיק לקוח'}
          className="relative h-full w-full border-0 bg-white"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
