'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, BookmarkCheck, CloudOff, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SavedMixesBoard } from '@/components/mortgage-advisor/SavedMixesBoard';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { stageMixForWorkspace } from '@/components/mortgage-advisor/workspace/draft';

export default function SavedMixesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { saved, ready, remove, rename, signedIn } = useSavedMixes();

  const personalAreaHref = session?.user?.role === 'ADVISOR' ? '/advisor-dashboard' : '/dashboard';

  const openInTool = (item: SavedMix) => {
    stageMixForWorkspace(item.mix);
    router.push('/mortgage-advisor');
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="container mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookmarkCheck className="h-6 w-6 text-blue-600" />
              תמהילים שמורים
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              התמהילים מסודרים לפי נכס — כל התמהילים לאותה כתובת יושבים יחד, ותמהילים ללא כתובת
              מקובצים לפי סכום המשכנתא. סימון תמהילים בתוך אותה קבוצה מציג השוואה גרפית ביניהם.
            </p>
          </div>
          <div className="flex gap-2">
            {session && (
              <Button variant="outline" size="sm" asChild>
                <Link href={personalAreaHref}>
                  <ArrowRight className="h-4 w-4 ml-1" />
                  לאזור האישי
                </Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href="/mortgage-advisor">
                <PieChart className="h-4 w-4 ml-1" />
                לכלי התכנון
              </Link>
            </Button>
          </div>
        </div>

        {!signedIn && ready && saved.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <CloudOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              התמהילים שמורים בדפדפן הזה בלבד.{' '}
              <Link href="/auth/login" className="underline font-semibold">
                התחברו לחשבון
              </Link>{' '}
              כדי שהם ייטענו לחשבון ויהיו זמינים מכל מכשיר.
            </p>
          </div>
        )}

        <SavedMixesBoard
          saved={saved}
          ready={ready}
          onOpen={openInTool}
          onDelete={remove}
          onRename={rename}
          emptyState={
            <Card className="border-slate-200">
              <CardContent className="py-14 text-center">
                <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-slate-700">עוד לא שמרתם תמהילים</h2>
                <p className="text-sm text-slate-500 mt-1 mb-5">
                  בנו תמהיל בכלי התכנון ולחצו על &quot;שמור תמהיל&quot; — הוא יופיע כאן.
                </p>
                <Button asChild>
                  <Link href="/mortgage-advisor">פתח את כלי התכנון</Link>
                </Button>
              </CardContent>
            </Card>
          }
        />
      </div>
    </div>
  );
}
