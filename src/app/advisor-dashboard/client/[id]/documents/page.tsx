'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, ArrowRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClientDocumentsPanel } from '@/components/advisor/ClientDocumentsPanel';
import { useClientDetail } from '@/components/advisor/useClientDetail';

/**
 * תיק המסמכים של הלקוח, בעמוד משלו.
 *
 * לכאן מגיעים מכפתור הגישה המהירה שבראש העמוד ומכרטיס תיק המסמכים שבדף הלקוח,
 * כדי לעבור על כל המסמכים ברצף בלי שאר החומר של התיק מסביב.
 */
export default function ClientDocumentsPage() {
  const params = useParams<{ id: string }>();
  const clientId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const { data: session, status } = useSession();
  const { client, loading, error, patch, setDocumentStatus } = useClientDetail(clientId);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/login');
    else if (session.user?.role !== 'ADVISOR') router.push('/dashboard');
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session || session.user?.role !== 'ADVISOR') return null;

  if (error || !client) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 py-10 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="text-sm text-slate-700">{error ?? 'הלקוח לא נמצא'}</p>
            <Button variant="outline" asChild>
              <Link href="/advisor-dashboard">חזרה לרשימת הלקוחות</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link href={`/advisor-dashboard/client/${client.id}`}>
              <ArrowRight className="ml-1 h-4 w-4" />
              חזרה ל{client.name}
            </Link>
          </Button>
          <h1 className="flex min-w-0 items-center gap-2 text-lg font-bold text-slate-900">
            <FolderOpen className="h-5 w-5 text-blue-600" />
            תיק המסמכים של {client.name}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">
        <ClientDocumentsPanel
          documents={client.documents}
          stage={client.stage}
          onStageChange={(stage) => void patch({ stage })}
          onStatusChange={(documentId, next) => void setDocumentStatus(documentId, next)}
        />
      </main>
    </div>
  );
}
