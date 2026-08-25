'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpLeft, LayoutGrid } from 'lucide-react';
import {
  platformTools,
  toolCategories,
  type ToolCategoryId,
} from '@/data/platform/tools';

type Filter = ToolCategoryId | 'all';

export default function ToolsShowcase() {
  const [filter, setFilter] = useState<Filter>('all');

  const visible =
    filter === 'all'
      ? platformTools
      : platformTools.filter((tool) => tool.category === filter);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `הכל · ${platformTools.length}` },
    ...toolCategories.map((c) => ({
      id: c.id as Filter,
      label: c.label,
    })),
  ];

  return (
    <div dir="rtl">
      {/* Filters */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {filters.map((f) => {
          const selected = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`relative z-0 overflow-hidden rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                selected ? 'text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="tools-filter-pill"
                  className="absolute inset-0 z-0 rounded-full bg-gradient-to-l from-blue-600 to-violet-600 shadow-lg"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-2">
                {f.id === 'all' && <LayoutGrid className="h-4 w-4" />}
                {f.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.25) }}
              >
                <Link href={tool.href} className="group block h-full">
                  <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-2xl">
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${tool.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                    />

                    {tool.badge && (
                      <span className="absolute left-4 top-4 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-700">
                        {tool.badge}
                      </span>
                    )}

                    <div
                      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <h3 className="mb-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-700">
                      {tool.title}
                    </h3>
                    <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">
                      {tool.description}
                    </p>

                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700">
                      פתחו את הכלי
                      <ArrowUpLeft className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
