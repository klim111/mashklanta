'use client';

import { useMemo } from 'react';
import { CalendarClock, Check, Clock, Inbox } from 'lucide-react';
import { groupTasks } from '@/lib/client-agenda';
import type { ClientTask } from '@/lib/client-agenda';
import { TaskItem } from './TaskItem';

/**
 * המשימות, מחולקות לשלוש קבוצות: מה שהמועד שלו עבר ולא הושלם, מה שנקבע לו
 * מועד, ומה שעדיין בלי תאריך. מה שהמועד שלו עבר מופיע ראשון, בצבע עדין ולא
 * באדום, עם אפשרות לעבור לביצוע או לבטל.
 */
export function TaskGroupsList({
  tasks,
  compact = false,
  columns = 1,
  onOpen,
  onSchedule,
  onCancel,
}: {
  tasks: ClientTask[];
  compact?: boolean;
  /** מספר העמודות בכל קבוצה — הסקירה צרה יותר מהאזור המלא */
  columns?: 1 | 2;
  onOpen: (task: ClientTask) => void;
  onSchedule?: (taskId: string, due: string | null) => void;
  onCancel?: (taskId: string) => void;
}) {
  const groups = useMemo(() => groupTasks(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-6 w-6" />
        </span>
        <p className="text-base font-black text-slate-800">אין משימות פתוחות</p>
        <p className="text-sm text-slate-500">כשיהיה משהו לעשות — הוא יופיע כאן וגם בלוח השנה.</p>
      </div>
    );
  }

  /*
    הכרטיסים מתמרכזים כמו הכותרת שמעליהם: בפריסה של שתי עמודות, כרטיס בודד
    בשורה האחרונה יושב במרכז ולא נצמד לצד. `grid` היה מצמיד אותו לעמודה
    הראשונה, ולכן כאן נעשה שימוש בעטיפה גמישה עם רוחב קבוע לכל כרטיס.
  */
  const grid = 'flex flex-wrap justify-center gap-2';
  const cell = columns === 2 ? 'w-full md:w-[calc(50%-0.25rem)]' : 'w-full';

  return (
    <div className="space-y-5">
      <Bucket
        title="ממתינות לביצוע"
        hint="המועד שקבעתם עבר. אפשר לבצע עכשיו, לקבוע מועד חדש או לבטל"
        icon={<Clock className="h-4 w-4" />}
        tone="amber"
        tasks={groups.overdue}
        grid={grid}
        cell={cell}
        compact={compact}
        overdue
        onOpen={onOpen}
        onSchedule={onSchedule}
        onCancel={onCancel}
      />
      <Bucket
        title="המשימות הבאות"
        hint="משובצות בלוח השנה לפי המועד שקבעתם"
        icon={<CalendarClock className="h-4 w-4" />}
        tone="blue"
        tasks={groups.scheduled}
        grid={grid}
        cell={cell}
        compact={compact}
        onOpen={onOpen}
        onSchedule={onSchedule}
      />
      <Bucket
        title="משימות ללא תאריך"
        hint="אפשר לקבוע להן מועד ושעה, והן ייכנסו ללוח"
        icon={<Inbox className="h-4 w-4" />}
        tone="slate"
        tasks={groups.undated}
        grid={grid}
        cell={cell}
        compact={compact}
        onOpen={onOpen}
        onSchedule={onSchedule}
      />
    </div>
  );
}

const TONES = {
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  slate: 'bg-slate-200 text-slate-700',
} as const;

function Bucket({
  title,
  hint,
  icon,
  tone,
  tasks,
  grid,
  cell,
  compact,
  overdue = false,
  onOpen,
  onSchedule,
  onCancel,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  tasks: ClientTask[];
  grid: string;
  /** רוחב כרטיס בודד בתוך העטיפה הגמישה */
  cell: string;
  compact: boolean;
  overdue?: boolean;
  onOpen: (task: ClientTask) => void;
  onSchedule?: (taskId: string, due: string | null) => void;
  onCancel?: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <section>
      <header className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black ${TONES[tone]}`}>
          {icon}
          {title}
          <span className="rounded-full bg-white/70 px-1.5 text-2xs">{tasks.length}</span>
        </span>
        <span className="text-sm font-medium text-slate-500">{hint}</span>
      </header>
      <div className={grid}>
        {tasks.map((task) => (
          <div key={task.id} className={cell}>
            <TaskItem
              task={task}
              compact={compact}
              overdue={overdue}
              onOpen={() => onOpen(task)}
              onSchedule={onSchedule ? (due) => onSchedule(task.id, due) : undefined}
              onCancel={onCancel ? () => onCancel(task.id) : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
