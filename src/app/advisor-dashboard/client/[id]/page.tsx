'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  FileText,
  Home as HomeIcon,
  Mail,
  Pencil,
  Phone,
  PieChart,
  TrendingUp,
  Undo2,
  UserRound,
  Users,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import VideoCallModal from '@/components/advisor-dashboard/VideoCallModal';
import { ClientDetailsForm } from '@/components/advisor/ClientDetailsForm';
import { SavedMixesBoard } from '@/components/mortgage-advisor/SavedMixesBoard';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { stageMixForWorkspace } from '@/components/mortgage-advisor/workspace/draft';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { DEAL_TYPES } from '@/components/mortgage-advisor/types';
import {
  CLIENT_STAGES,
  DOCUMENT_STATUS_LABELS,
  STAGE_LABELS,
  stageIndex,
} from '@/lib/client-process';
import type { ClientDocumentStatus, ClientStage } from '@/lib/client-process';

interface ClientDocumentView {
  id: string;
  key: string;
  name: string;
  stage: ClientStage;
  status: ClientDocumentStatus;
  required: boolean;
  note: string | null;
  submittedAt: string | null;
}

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  stage: ClientStage;
  progress: number;
  household: 'SINGLE' | 'COUPLE';
  age: number | null;
  partnerName: string | null;
  partnerAge: number | null;
  income: number | null;
  partnerIncome: number | null;
  expenses: number | null;
  existingLoans: number | null;
  creditScore: number | null;
  downPayment: number | null;
  propertyValue: number | null;
  propertyAddress: string | null;
  mortgageAmount: number | null;
  dealType: keyof typeof DEAL_TYPES | null;
  notes: string | null;
  plannedMonthlyPayment: number | null;
  projectedCashFlow: number | null;
  documents: ClientDocumentView[];
}

/**
 * דף הלקוח באזור היועץ: הפרטים הכלליים, השלב בתהליך והמסמכים למעלה, ומתחתיהם
 * אזור התמהילים של הלקוח — אותו לוח שהלקוח רואה באזור האישי שלו.
 */
export default function AdvisorClientPage() {
  const params = useParams<{ id: string }>();
  const clientId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const { data: session, status } = useSession();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const { saved, ready, remove, rename } = useSavedMixes({ clientId });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/login');
    else if (session.user?.role !== 'ADVISOR') router.push('/dashboard');
  }, [session, status, router]);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      const response = await fetch(`/api/clients/${clientId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      setClient(await response.json());
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את פרטי הלקוח');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) setClient(await response.json());
  };

  const setDocumentStatus = async (documentId: string, next: ClientDocumentStatus) => {
    const response = await fetch(`/api/clients/${clientId}/documents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, status: next }),
    });
    if (!response.ok) return;
    // רק המסמך שהשתנה מתעדכן, כדי שהסימון יגיב מיד בלי טעינה מחדש של הדף
    const updated = await response.json();
    setClient((current) =>
      current
        ? {
            ...current,
            documents: current.documents.map((doc) =>
              doc.id === updated.id
                ? { ...doc, status: updated.status, submittedAt: updated.submittedAt }
                : doc
            ),
          }
        : current
    );
  };

  const openMixInTool = (item: SavedMix) => {
    stageMixForWorkspace(item.mix);
    router.push(`/mortgage-advisor?client=${clientId}`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session || session.user?.role !== 'ADVISOR') return null;

  if (error || !client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <p className="text-sm text-slate-700">{error ?? 'הלקוח לא נמצא'}</p>
            <Button variant="outline" asChild>
              <Link href="/advisor-dashboard">חזרה לרשימת הלקוחות</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submitted = client.documents.filter((doc) => doc.status !== 'PENDING');
  const remaining = client.documents.filter((doc) => doc.status === 'PENDING');
  const householdLabel = client.household === 'COUPLE' ? 'זוג' : 'יחיד';
  const ages = [client.age, client.household === 'COUPLE' ? client.partnerAge : null]
    .filter((age): age is number => typeof age === 'number' && age > 0)
    .join(' / ');

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="h-9" asChild>
            <Link href="/advisor-dashboard">
              <ArrowRight className="h-4 w-4 ml-1" />
              הלקוחות שלי
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-900 truncate">{client.name}</h1>
            <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {client.email}
              </span>
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {client.phone}
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setCallOpen(true)}>
            <Video className="h-4 w-4 ml-1" />
            שיחת וידאו
          </Button>
          <Button size="sm" className="h-9" asChild>
            <Link href={`/mortgage-advisor?client=${client.id}`}>
              <PieChart className="h-4 w-4 ml-1" />
              בנה תמהיל ללקוח
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-5 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">פרטי הלקוח</p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setEditing((open) => !open)}
          >
            <Pencil className="h-3.5 w-3.5 ml-1" />
            {editing ? 'סגור עריכה' : 'ערוך פרטים'}
          </Button>
        </div>

        {editing && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="p-4">
              <ClientDetailsForm
                values={{
                  phone: client.phone,
                  household: client.household,
                  age: client.age,
                  partnerName: client.partnerName,
                  partnerAge: client.partnerAge,
                  income: client.income,
                  partnerIncome: client.partnerIncome,
                  expenses: client.expenses,
                  existingLoans: client.existingLoans,
                  propertyValue: client.propertyValue,
                  propertyAddress: client.propertyAddress,
                  mortgageAmount: client.mortgageAmount,
                  dealType: client.dealType,
                  notes: client.notes,
                }}
                onSubmit={async (values) => {
                  await patch(values);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* הפרטים הכלליים */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard
            icon={<HomeIcon className="h-4 w-4" />}
            label="הנכס"
            value={client.propertyAddress || (client.propertyValue ? 'ללא כתובת' : 'טרם הוגדר')}
            hint={
              [
                client.propertyValue ? `עלות ${formatShekel(client.propertyValue)}` : null,
                client.dealType ? DEAL_TYPES[client.dealType] : null,
              ]
                .filter(Boolean)
                .join(' · ') || undefined
            }
          />
          <DetailCard
            icon={client.household === 'COUPLE' ? <Users className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            label="הרכב וגיל"
            value={ages ? `${householdLabel} · גיל ${ages}` : householdLabel}
            hint={client.household === 'COUPLE' && client.partnerName ? `עם ${client.partnerName}` : undefined}
          />
          <DetailCard
            icon={<Banknote className="h-4 w-4" />}
            label="גובה המשכנתא"
            value={client.mortgageAmount ? formatShekel(client.mortgageAmount) : 'טרם נקבע'}
            hint={
              client.plannedMonthlyPayment
                ? `החזר מתוכנן ${formatShekel(client.plannedMonthlyPayment)}`
                : undefined
            }
          />
          <DetailCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="צפי תזרים חודשי"
            value={
              client.projectedCashFlow === null
                ? 'חסרים נתוני הכנסה'
                : formatShekel(client.projectedCashFlow)
            }
            hint={
              client.projectedCashFlow === null
                ? 'הזינו הכנסות והוצאות'
                : client.projectedCashFlow >= 0
                  ? 'נשאר חופשי אחרי המשכנתא וההלוואות'
                  : 'התזרים שלילי — ההחזר גבוה מדי'
            }
            tone={
              client.projectedCashFlow !== null && client.projectedCashFlow < 0 ? 'danger' : 'default'
            }
          />
        </div>

        {/* השלב בתהליך */}
        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">שלב בתהליך</p>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[11px]">
                {STAGE_LABELS[client.stage]} · {client.progress}%
              </Badge>
            </div>
            <StageTrack stage={client.stage} onSelect={(stage) => void patch({ stage })} />
            <p className="text-[11px] text-slate-500">
              לחיצה על שלב מעדכנת את מקומו של הלקוח בתהליך ופותחת את המסמכים שנדרשים בו.
            </p>
          </CardContent>
        </Card>

        {/* המסמכים */}
        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                מסמכים
              </p>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                  {submitted.length} הוגשו
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                  {remaining.length} נותרו
                </Badge>
              </div>
            </div>

            {client.documents.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                אין עדיין מסמכים פתוחים. הם ייפתחו לפי השלב בתהליך.
              </p>
            ) : (
              <div className="space-y-3">
                {CLIENT_STAGES.filter((stage) =>
                  client.documents.some((doc) => doc.stage === stage)
                ).map((stage) => (
                  <div key={stage} className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-600">{STAGE_LABELS[stage]}</p>
                    {client.documents
                      .filter((doc) => doc.stage === stage)
                      .map((doc) => (
                        <DocumentRow
                          key={doc.id}
                          document={doc}
                          onChange={(next) => void setDocumentStatus(doc.id, next)}
                        />
                      ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* התמהילים של הלקוח */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              התמהילים של {client.name}
            </h2>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href={`/mortgage-advisor?client=${client.id}`}>הוסף תמהיל</Link>
            </Button>
          </div>

          <SavedMixesBoard
            saved={saved}
            ready={ready}
            onOpen={openMixInTool}
            onDelete={remove}
            onRename={rename}
            emptyState={
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                  <PieChart className="h-11 w-11 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">עוד לא נשמרו תמהילים ללקוח הזה.</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    כל תמהיל שתשמרו בכלי התכנון עבורו יופיע כאן וגם באזור האישי שלו.
                  </p>
                  <Button size="sm" asChild>
                    <Link href={`/mortgage-advisor?client=${client.id}`}>בנה תמהיל ראשון</Link>
                  </Button>
                </CardContent>
              </Card>
            }
          />
        </div>
      </div>

      <VideoCallModal
        isOpen={callOpen}
        onClose={() => setCallOpen(false)}
        client={{
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone ?? undefined,
          status: 'ACTIVE',
          progress: client.progress,
          propertyValue: client.propertyValue ?? undefined,
          downPayment: client.downPayment ?? undefined,
          income: client.income ?? undefined,
          creditScore: client.creditScore ?? undefined,
        }}
        advisor={{
          name: session.user?.name || 'יועץ',
          email: session.user?.email || '',
        }}
      />
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-3.5">
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span className="text-blue-600">{icon}</span>
          {label}
        </p>
        <p
          className={`mt-1 text-base font-bold truncate ${
            tone === 'danger' ? 'text-red-600' : 'text-slate-900'
          }`}
          title={value}
        >
          {value}
        </p>
        {hint && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** רצף השלבים. השלבים שהושלמו מסומנים, והלחיצה מעבירה את הלקוח לשלב אחר */
function StageTrack({
  stage,
  onSelect,
}: {
  stage: ClientStage;
  onSelect: (stage: ClientStage) => void;
}) {
  const current = stageIndex(stage);

  return (
    <div className="flex flex-wrap gap-1.5">
      {CLIENT_STAGES.map((item, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              active
                ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700'
                : done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            {STAGE_LABELS[item]}
          </button>
        );
      })}
    </div>
  );
}

function DocumentRow({
  document,
  onChange,
}: {
  document: ClientDocumentView;
  onChange: (status: ClientDocumentStatus) => void;
}) {
  const submitted = document.status !== 'PENDING';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          document.status === 'APPROVED'
            ? 'bg-emerald-100 text-emerald-700'
            : document.status === 'REJECTED'
              ? 'bg-red-100 text-red-700'
              : document.status === 'SUBMITTED'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-400'
        }`}
      >
        {submitted ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-800">
          {document.name}
          {!document.required && <span className="text-slate-400"> (לא חובה)</span>}
        </p>
        <p className="text-[10px] text-slate-500">
          {DOCUMENT_STATUS_LABELS[document.status]}
          {document.submittedAt &&
            ` · ${new Date(document.submittedAt).toLocaleDateString('he-IL')}`}
        </p>
      </div>

      {document.status === 'PENDING' ? (
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => onChange('SUBMITTED')}>
          סמן כהוגש
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          {document.status !== 'APPROVED' && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => onChange('APPROVED')}>
              אושר
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-slate-500"
            title="החזר לרשימת המסמכים החסרים"
            onClick={() => onChange('PENDING')}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
