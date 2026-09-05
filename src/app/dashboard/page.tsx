'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  FileText,
  Gavel,
  User,
  LogOut,
  Settings,
  Loader2,
  Home as HomeIcon,
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { PlansOverview } from '@/components/plan/PlansOverview';
import { ClientMeetings } from '@/components/dashboard/ClientMeetings';
import { ToolsHub } from '@/components/dashboard/ToolsHub';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { BankRateRequests } from '@/components/dashboard/BankRateRequests';

type TabType = 'plans' | 'rate-requests' | 'tools' | 'settings';

const tabs: Array<{ id: TabType; label: string; icon: typeof FileText }> = [
  { id: 'plans', label: 'דאשבורד משכנתאות', icon: FileText },
  { id: 'rate-requests', label: 'תמהילים שהוגשו לבנקים', icon: Gavel },
  { id: 'tools', label: 'כלים ומחשבונים', icon: Calculator },
  { id: 'settings', label: 'הגדרות', icon: Settings },
];

const TAB_IDS = tabs.map((tab) => tab.id);

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('plans');

  // קישור ישיר לאזור מסוים, למשל /dashboard#rate-requests אחרי שמירת בקשה
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if ((TAB_IDS as string[]).includes(hash)) setActiveTab(hash as TabType);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
    } else if (session.user?.role === 'ADVISOR') {
      router.push('/advisor-dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!session) return null;

  const displayName = session.user?.name || session.user?.email || 'אורח';

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black text-white">משכלתנא</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-3 pr-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden max-w-[12rem] truncate text-sm font-semibold text-white/80 sm:block">
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </div>
          </div>

          <div className="pb-8 pt-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-bold tracking-wide text-white/40">האזור האישי</p>
              <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">
                שלום, {session.user?.name?.split(' ')[0] || 'ברוכים הבאים'}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
                מכאן מנהלים את תכנון המשכנתא — חמישה שלבים, מהניתוח הפיננסי ועד החתימה. כל נתון
                נשמר בחשבון ועובר אוטומטית לשלב הבא.
              </p>
            </motion.div>

            <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all sm:w-auto sm:px-4 sm:text-sm ${
                      active
                        ? 'bg-white text-slate-900 shadow-lg'
                        : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          {activeTab === 'plans' && (
            <>
              {/* פגישות שהיועץ הציע — אישור המועד כאן מסמן אותה כמאושרת אצלו */}
              <ClientMeetings />
              <PlansOverview />
            </>
          )}

          {activeTab === 'rate-requests' && <BankRateRequests />}

          {activeTab === 'tools' && <ToolsHub />}

          {activeTab === 'settings' && <SettingsPanel />}
        </motion.div>
      </main>
    </div>
  );
}
