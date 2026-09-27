'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderOpen, Home, PieChart, Plus, Tag, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MixSummaryCard } from '@/components/mortgage-advisor/MixSummaryCard';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { stageMixForWorkspace } from '@/components/mortgage-advisor/workspace/draft';
import { EmptyState, SectionCard } from './ui';
import { useMixCategories } from './useAdvisorCrm';

type Mode = 'categories' | 'clients';

/**
 * אזור התמהילים השמורים של היועץ.
 *
 * תמהיל שנשמר ללקוח מוצג תחת אותו לקוח ולצד הנכס שהוא שויך אליו; תמהיל שנשמר
 * בלי לקוח מסודר לפי הקטגוריה שהיועץ בחר בעת היצירה.
 */
export function MixesPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('categories');
  const [newCategory, setNewCategory] = useState('');
  const { saved, ready, remove, rename } = useSavedMixes();
  const { categories, add, refresh } = useMixCategories();

  const unassigned = useMemo(() => saved.filter((item) => !item.clientId), [saved]);
  const assigned = useMemo(() => saved.filter((item) => item.clientId), [saved]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, { name: string; items: SavedMix[] }>();
    categories.forEach((category) =>
      groups.set(category.id, { name: category.name, items: [] })
    );
    const loose: SavedMix[] = [];

    unassigned.forEach((item) => {
      const group = item.categoryId ? groups.get(item.categoryId) : undefined;
      if (group) group.items.push(item);
      else loose.push(item);
    });

    return { groups: Array.from(groups.entries()), loose };
  }, [categories, unassigned]);

  const byClient = useMemo(() => {
    const groups = new Map<string, { name: string; items: SavedMix[] }>();
    assigned.forEach((item) => {
      const key = item.clientId as string;
      const group = groups.get(key);
      if (group) group.items.push(item);
      else groups.set(key, { name: item.clientName || 'לקוח', items: [item] });
    });
    return Array.from(groups.entries());
  }, [assigned]);

  const openMix = (item: SavedMix) => {
    stageMixForWorkspace(item.mix);
    router.push(item.clientId ? `/mortgage-advisor?client=${item.clientId}` : '/mortgage-advisor');
  };

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCategory.trim()) return;
    await add(newCategory.trim());
    setNewCategory('');
    await refresh();
  };

  if (!ready) {
    return <p className="py-10 text-center text-sm text-slate-500">טוען תמהילים...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('categories')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              mode === 'categories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            ללא שיוך ללקוח ({unassigned.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('clients')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              mode === 'clients' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            משויכים ללקוח ({assigned.length})
          </button>
        </div>

        <Button size="sm" className="ms-auto h-9 text-xs" asChild>
          <Link href="/mortgage-advisor">
            <Plus className="ml-1 h-4 w-4" />
            בנה תמהיל חדש
          </Link>
        </Button>
      </div>

      {mode === 'categories' ? (
        <div className="space-y-4">
          <form
            onSubmit={addCategory}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
          >
            <Tag className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">קטגוריות התמהילים שלי</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((category) => (
                <Badge key={category.id} variant="secondary" className="text-[10px]">
                  {category.name} · {category.mixCount}
                </Badge>
              ))}
            </div>
            <div className="ms-auto flex items-center gap-2">
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="קטגוריה חדשה"
                className="h-8 w-40 text-xs"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                הוסף
              </Button>
            </div>
          </form>

          {unassigned.length === 0 ? (
            <EmptyState
              icon={<PieChart className="h-6 w-6" />}
              title="אין תמהילים ללא שיוך"
              hint="כל תמהיל שתשמרו בלי לבחור לקוח יופיע כאן, מסודר לפי הקטגוריה שתבחרו בשמירה."
              action={
                <Button size="sm" asChild>
                  <Link href="/mortgage-advisor">בנה תמהיל</Link>
                </Button>
              }
            />
          ) : (
            <>
              {byCategory.groups
                .filter(([, group]) => group.items.length > 0)
                .map(([id, group]) => (
                  <MixGroup
                    key={id}
                    icon={<FolderOpen className="h-4 w-4 text-blue-600" />}
                    title={group.name}
                    items={group.items}
                    onOpen={openMix}
                    onDelete={remove}
                    onRename={rename}
                  />
                ))}

              {byCategory.loose.length > 0 && (
                <MixGroup
                  icon={<FolderOpen className="h-4 w-4 text-slate-400" />}
                  title="ללא קטגוריה"
                  items={byCategory.loose}
                  onOpen={openMix}
                  onDelete={remove}
                  onRename={rename}
                />
              )}
            </>
          )}
        </div>
      ) : byClient.length === 0 ? (
        <EmptyState
          icon={<UserRound className="h-6 w-6" />}
          title="אין תמהילים משויכים ללקוח"
          hint="בשמירת תמהיל בחרו את הלקוח שהוא נבנה עבורו — הוא יופיע כאן ואצלו באזור האישי."
        />
      ) : (
        byClient.map(([clientId, group]) => (
          <MixGroup
            key={clientId}
            icon={<UserRound className="h-4 w-4 text-blue-600" />}
            title={group.name}
            href={`/advisor-dashboard/client/${clientId}`}
            items={group.items}
            onOpen={openMix}
            onDelete={remove}
            onRename={rename}
            showPropertyLink
          />
        ))
      )}
    </div>
  );
}

function MixGroup({
  icon,
  title,
  href,
  items,
  onOpen,
  onDelete,
  onRename,
  showPropertyLink = false,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
  items: SavedMix[];
  onOpen: (item: SavedMix) => void;
  onDelete: (mixId: string) => void;
  onRename: (mixId: string, name: string) => void;
  showPropertyLink?: boolean;
}) {
  return (
    <SectionCard
      icon={icon}
      title={
        href ? (
          <Link href={href} className="hover:underline">
            {title}
          </Link>
        ) : (
          title
        )
      }
      action={<span className="text-[11px] text-slate-500">{items.length} תמהילים</span>}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.mix.id} className="space-y-1.5">
            {showPropertyLink && (
              <div className="flex items-center gap-1.5">
                {item.planId ? (
                  <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
                    <Home className="h-3 w-3" />
                    {item.planAddress || 'נכס של הלקוח'}
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100">
                    <Home className="h-3 w-3" />
                    תמהיל לא משויך לנכס
                  </Badge>
                )}
              </div>
            )}
            <MixSummaryCard
              mix={item.mix}
              summary={item.summary}
              savedAt={item.savedAt}
              onOpen={() => onOpen(item)}
              onDelete={item.locked ? undefined : () => onDelete(item.mix.id)}
              onRename={item.locked ? undefined : (name) => onRename(item.mix.id, name)}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
