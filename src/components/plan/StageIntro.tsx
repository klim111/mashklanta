'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Headset, ListChecks, PackageCheck } from 'lucide-react';
import { NEW_PLAN_FLOW } from '@/lib/mortgage-plan';
import type { PlanFlow, PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor, planStageMeta } from '@/data/platform/planStages';
import { STAGE_GUIDE } from '@/data/platform/stageGuide';
import { demoId } from '@/demo/demo-attr';

/**
 * עמוד ההסבר שלפני כל שלב (למעט כלי בניית התמהיל).
 *
 * מסך אחד, בלי "המשך" ובלי מעבר בין מסכים: למה השלב חשוב, מה עושים בו ומה
 * יוצא ממנו — ומיד כפתור "התחילו את השלב". אין כאן שאלה אם לעשות את השלב לבד
 * או עם יועץ: מתחילים לבד, והפנייה ליועץ זמינה בכל שלב מהכפתור הצף.
 */
export function StageIntro({
  stage,
  onStart,
  flow = NEW_PLAN_FLOW,
}: {
  stage: PlanStageId;
  onStart: () => void;
  flow?: PlanFlow;
}) {
  const journey = journeyStageFor(stage);
  const meta = planStageMeta(stage, flow);
  const guide = STAGE_GUIDE[stage];
  /*
    במיחזור חלק מהשלבים מנוסחים אחרת (הגשה לבנק הנוכחי, אימות ההצעה שלו), ואז
    ההסבר נלקח מהכותרות של המיחזור ולא מהמדריך של משכנתא חדשה.
  */
  const refinanceCopy = meta.title !== journey.title;
  const lead = refinanceCopy ? meta.summary : guide.importance;
  const goals = refinanceCopy ? meta.steps : guide.goals;
  const outputs = refinanceCopy ? [] : guide.outputs;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8"
    >
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-black text-slate-400">על השלב</p>
        <h3 className="mt-1 text-subtitle font-black leading-snug text-slate-900">
          {meta.title}
        </h3>
        <p className="mt-3 text-info font-medium leading-relaxed text-slate-600">{lead}</p>
      </header>

      <div className={`mx-auto mt-6 grid max-w-4xl gap-4 ${outputs.length > 0 ? 'md:grid-cols-2' : ''}`}>
        <IntroList
          icon={<ListChecks className="h-4 w-4 text-white" />}
          gradient={journey.gradient}
          title="מה עושים בשלב"
          items={goals}
        />
        {outputs.length > 0 && (
          <IntroList
            icon={<PackageCheck className="h-4 w-4 text-white" />}
            gradient="from-emerald-500 to-teal-600"
            title="מה יש לכם בסוף השלב"
            items={outputs}
          />
        )}
      </div>

      <p className="mx-auto mt-5 flex max-w-4xl items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-info leading-relaxed text-violet-950">
        <Headset className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
        <span>
          בכל שלב שבו תרגישו שאתם צריכים ייעוץ או עזרה, הכפתור{' '}
          <span className="font-black">«פנו ליועץ לעזרה בשלב זה»</span> זמין לכם בפינת המסך. יועץ
          משכלנתא ייכנס לתמונה עם כל מה שכבר הזנתם.
        </span>
      </p>

      <div className="mt-6 flex justify-center">
        <button
          {...demoId('plan-stage-intro-start')}
          type="button"
          onClick={onStart}
          className={`inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-8 text-cta font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl`}
        >
          התחילו את השלב
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
    </motion.section>
  );
}

function IntroList({
  icon,
  gradient,
  title,
  items,
}: {
  icon: ReactNode;
  gradient: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
      <h4 className="mb-3 flex items-center gap-2 text-info font-black text-slate-900">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}
        >
          {icon}
        </span>
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-info leading-relaxed text-slate-700">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
