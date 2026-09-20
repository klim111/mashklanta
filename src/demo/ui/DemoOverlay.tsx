'use client';

/**
 * שכבת ההדגמה — הסרגל התחתון, הכתוביות, הפקדים, פס ההתקדמות, מצב ההתנסות ומסך הסיום.
 *
 * הכול ב-RTL, מותאם למסך צר: בטלפון הכתובית מעל שורת הפקדים. הסרגל מונע
 * מלחיצות עליו לסגור חלונות של Radix (הן נחשבות "לחיצה מחוץ לחלון").
 */

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Hand,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useDemoEngine } from '../engine/DemoEngineProvider';
import { resolveText } from '../engine/text';
import { VirtualCursor } from './VirtualCursor';

function Control({
  label,
  onClick,
  children,
  primary = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`mk-demo-control ${primary ? 'is-primary' : ''}`}
    >
      {children}
    </button>
  );
}

export function DemoOverlay() {
  const engine = useDemoEngine();
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    if (engine?.status !== 'playing') setConfirmExit(false);
  }, [engine?.status]);

  if (!engine) return null;
  const { flow, status, stepIndex, step, caption, title, entry } = engine;
  const total = flow?.steps.length ?? 0;
  const progress = total ? ((stepIndex + (status === 'completed' ? 1 : 0)) / total) * 100 : 0;
  const userControl = status === 'user-control';
  const canTry = Boolean(step?.allowTryIt) && (status === 'playing' || status === 'paused');

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  const preventFocus = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div
      dir="rtl"
      className="mk-demo-ui"
      onPointerDown={stop}
      onMouseDown={preventFocus}
      onTouchStart={stop}
      onKeyDown={stop}
    >
      <VirtualCursor />

      {/* סימון קבוע — כל מה שרואים כאן הוא הדגמה על נתונים בדויים */}
      <div className="mk-demo-badge">
        <FlaskConical className="h-3.5 w-3.5" />
        <span>מצב הדגמה · נתונים לדוגמה בלבד</span>
      </div>

      {/* מצב ההתנסות */}
      {userControl && (
        <div className="mk-demo-tryit">
          <div className="mk-demo-tryit__text">
            <Hand className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-black text-slate-900">מצב התנסות – הנתונים אינם נשמרים</p>
              <p className="text-xs text-slate-600">
                {step?.tryItHint ? resolveText(step.tryItHint, engine.state) : 'שנו שדות, סליידרים ואפשרויות — הכלי מחשב מחדש כרגיל, על נתוני ההדגמה בלבד.'}
              </p>
            </div>
          </div>
          <div className="mk-demo-tryit__actions">
            <button type="button" onClick={engine.resume} className="mk-demo-button is-primary">
              <Play className="h-4 w-4" />
              המשך בהדגמה
            </button>
            <button type="button" onClick={engine.exit} className="mk-demo-button">
              <X className="h-4 w-4" />
              יציאה
            </button>
          </div>
        </div>
      )}

      {/* מסך הסיום */}
      {status === 'completed' && flow && (
        <div className="mk-demo-end" role="dialog" aria-modal="true">
          <div className="mk-demo-end__card">
            <span className="mk-demo-end__icon">
              <Sparkles className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-black text-slate-900">סיימתם את ההדגמה: {flow.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              כל מה שראיתם רץ על נתונים בדויים ולא נשמר. אפשר לצפות שוב, להמשיך להדגמה אחרת, או
              לפתוח את הכלי האמיתי ולהתחיל לבד.
            </p>
            {flow.nextDemos && flow.nextDemos.length > 0 && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {flow.nextDemos
                  .map((id) => engine.catalog.find((item) => item.id === id))
                  .filter((item): item is NonNullable<typeof item> => Boolean(item))
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => engine.startAnother(item.id)}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-right transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-slate-900">{item.title}</span>
                          <span className="block text-[11px] text-slate-500">כ-{item.minutes} דק׳</span>
                        </span>
                        <ArrowLeft className="mr-auto h-4 w-4 shrink-0 text-blue-600" />
                      </button>
                    );
                  })}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={engine.restart} className="mk-demo-button">
                <RotateCcw className="h-4 w-4" />
                צפו שוב
              </button>
              <button type="button" onClick={engine.exit} className="mk-demo-button is-primary">
                סיום ויציאה
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* הסרגל התחתון */}
      {!userControl && status !== 'completed' && (
        <div className="mk-demo-bar" role="region" aria-label="פקדי ההדגמה">
          <div className="mk-demo-bar__progress" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="mk-demo-bar__body">
            <div className="mk-demo-bar__meta">
              <span className="mk-demo-bar__title">{entry?.title ?? 'הדגמה'}</span>
              {total > 0 && (
                <span className="mk-demo-bar__counter">
                  צעד {Math.min(stepIndex + 1, total)} מתוך {total}
                </span>
              )}
            </div>

            <div className="mk-demo-bar__caption" aria-live="polite">
              {status === 'loading' ? (
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  טוענים את ההדגמה…
                </span>
              ) : engine.loadError ? (
                <span className="text-rose-600">{engine.loadError}</span>
              ) : (
                <>
                  {title && <span className="mk-demo-bar__step-title">{title}</span>}
                  <span>{caption}</span>
                </>
              )}
            </div>

            <div className="mk-demo-bar__controls">
              {canTry && (
                <button type="button" onClick={engine.tryIt} className="mk-demo-button is-try">
                  <Hand className="h-4 w-4" />
                  <span>עצרו ונסו בעצמכם</span>
                </button>
              )}
              <Control label="הצעד הקודם" onClick={engine.prev} disabled={stepIndex === 0}>
                <ChevronRight className="h-5 w-5" />
              </Control>
              <Control
                label={status === 'playing' ? 'השהיה' : 'ניגון'}
                onClick={status === 'playing' ? engine.pause : engine.play}
                primary
              >
                {status === 'playing' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Control>
              <Control label="הצעד הבא" onClick={engine.next} disabled={total === 0}>
                <ChevronLeft className="h-5 w-5" />
              </Control>
              <Control label="מההתחלה" onClick={engine.restart}>
                <RotateCcw className="h-4 w-4" />
              </Control>
              {confirmExit ? (
                <button type="button" onClick={engine.exit} className="mk-demo-button is-danger">
                  לצאת מההדגמה?
                </button>
              ) : (
                <Control label="יציאה מההדגמה" onClick={() => setConfirmExit(true)}>
                  <X className="h-5 w-5" />
                </Control>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
