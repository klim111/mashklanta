'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpLeft, Lightbulb, Sparkles, Wrench } from 'lucide-react';
import { PLAN_STAGE_TOOLS, planToolHref, toolsByIds, toolById } from '@/data/platform/planStages';
import { stageHints } from '@/lib/mortgage-plan';
import type { HintTone, PlanData, PlanStageId } from '@/lib/mortgage-plan';
import type { PlatformTool } from '@/data/platform/tools';

const hintTone: Record<HintTone, { ring: string; badge: string; text: string }> = {
  info: {
    ring: 'border-blue-200 bg-blue-50/50',
    badge: 'bg-blue-100 text-blue-700',
    text: 'text-blue-900',
  },
  warning: {
    ring: 'border-amber-300 bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-800',
    text: 'text-amber-900',
  },
  success: {
    ring: 'border-emerald-200 bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-900',
  },
};

function ToolCard({
  tool,
  index,
  href,
}: {
  tool: PlatformTool;
  index: number;
  href: string;
}) {
  const Icon = tool.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-sm`}
        >
          <Icon className="h-5 w-5 text-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 group-hover:text-blue-700">
            {tool.title}
            <ArrowUpLeft className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:-translate-y-0.5 group-hover:text-blue-500" />
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 line-clamp-2">
            {tool.description}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * הכלים של השלב.
 *
 * למעלה הכלים שהשלב נשען עליהם, ומתחתם כלים שאינם חובה — אלה מוצגים תמיד, אבל
 * כלי שהנתונים שהוזנו הופכים אותו לרלוונטי עולה לראש הרשימה עם הסיבה שבגללה
 * הוא הוצע דווקא עכשיו.
 */
export function StageTools({
  stage,
  data,
  planId,
  compact = false,
}: {
  stage: PlanStageId;
  data: PlanData;
  planId: string;
  compact?: boolean;
}) {
  const config = PLAN_STAGE_TOOLS[stage];
  const essential = toolsByIds(config.essential);
  const hints = stageHints(stage, data);

  const hinted = new Set(hints.map((hint) => hint.toolId));
  const rest = toolsByIds(config.optional).filter((tool) => !hinted.has(tool.id));
  const hrefFor = (href: string) => planToolHref(href, planId);

  if (compact) {
    const extras = [...hints.flatMap((hint) => {
      const tool = toolById(hint.toolId);
      return tool ? [{ tool, hint }] : [];
    }), ...rest.map((tool) => ({ tool, hint: null as null }))];

    if (extras.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400">כלים נוספים:</span>
        {extras.map(({ tool, hint }) => (
          <Link
            key={tool.id}
            href={hrefFor(tool.href)}
            target="_blank"
            rel="noopener noreferrer"
            title={hint?.reason ?? tool.description}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5 ${
              hint
                ? hintTone[hint.tone].badge
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            {tool.title}
            <ArrowUpLeft className="h-3 w-3 opacity-50" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
          <Wrench className="h-4 w-4 text-blue-600" />
          הכלים של השלב
        </h4>
        <div className="space-y-2.5">
          {essential.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} href={hrefFor(tool.href)} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-1 flex items-center gap-2 text-sm font-black text-slate-900">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          כלים שכדאי לשקול
        </h4>
        <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
          לא חובה למעבר לשלב הבא — אבל לפי מה שהזנתם, אלה יכולים לשנות את התוצאה.
        </p>

        <div className="space-y-2.5">
          {hints.map((hint, index) => {
            const tool = toolById(hint.toolId);
            if (!tool) return null;
            const tone = hintTone[hint.tone];
            const Icon = tool.icon;

            return (
              <motion.div
                key={`${hint.toolId}-${hint.reason}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Link
                  href={hrefFor(tool.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block rounded-2xl border p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${tone.ring}`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tool.gradient}`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    <span className="flex-1 text-sm font-bold text-slate-900">{tool.title}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${tone.badge}`}
                    >
                      <Sparkles className="h-3 w-3" />
                      מומלץ לכם
                    </span>
                  </span>
                  <span className={`mt-2 block text-[11px] leading-relaxed ${tone.text}`}>
                    {hint.reason}
                  </span>
                </Link>
              </motion.div>
            );
          })}

          {rest.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              index={hints.length + index}
              href={hrefFor(tool.href)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
