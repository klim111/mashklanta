'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  LogOut,
  Home as HomeIcon,
  User,
  FileText,
  BarChart3,
  BookmarkCheck,
  PieChart,
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { SavedMixesWidget } from '@/components/mortgage-advisor/SavedMixesWidget';
import { ClientList } from '@/components/advisor/ClientList';
import { useAdvisorClients } from '@/components/advisor/useAdvisorClients';

type TabType = 'clients' | 'calendar' | 'analytics' | 'settings';

export default function AdvisorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const isAdvisor = session?.user?.role === 'ADVISOR';
  const { clients, ready, error, addClient } = useAdvisorClients(isAdvisor);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
    } else if (session.user?.role !== 'ADVISOR') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'ADVISOR') {
    return null;
  }

  const tabs = [
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'calendar', label: 'לוח שנה', icon: Calendar },
    { id: 'analytics', label: 'אנליטיקה', icon: BarChart3 },
    { id: 'settings', label: 'הגדרות', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-16 gap-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <HomeIcon className="w-6 h-6 text-white" />
                </div>
                <span className="truncate font-bold text-lg sm:text-xl">משכנתא - יועצים</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/saved-mixes"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <BookmarkCheck className="w-4 h-4" />
                תמהילים שמורים
              </Link>
              <Link
                href="/mortgage-advisor"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                <PieChart className="w-4 h-4" />
                כלי התכנון
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <span className="hidden text-sm font-medium lg:inline">{session.user?.name || session.user?.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            שלום, {session.user?.name || 'יועץ יקר'}!
          </h1>
          <p className="text-gray-600 mt-2">ברוך הבא לדשבורד היועצים</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">סה"כ לקוחות</p>
                  <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">בתהליך</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {clients.filter(c => c.stage !== 'INTAKE' && c.stage !== 'COMPLETED').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">תמהילים שמורים</p>
                  <p className="text-2xl font-bold text-violet-600">
                    {clients.reduce((total, client) => total + client.mixCount, 0)}
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-violet-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">מסמכים שממתינים</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {clients.reduce((total, client) => total + client.openDocuments, 0)}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <SavedMixesWidget />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex overflow-x-auto border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors sm:px-6 sm:py-4 ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <ClientList clients={clients} ready={ready} error={error} onAddClient={addClient} />
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-6">לוח שנה</h2>
              <div className="text-center py-16 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>לוח שנה יופיע כאן בקרוב</p>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-6">אנליטיקה</h2>
              <div className="text-center py-16 text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>גרפים וסטטיסטיקות יופיעו כאן בקרוב</p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-6">הגדרות</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">פרטים אישיים</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                      <input
                        type="text"
                        defaultValue={session.user?.name || ''}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">כתובת מייל</label>
                      <input
                        type="email"
                        defaultValue={session.user?.email || ''}
                        disabled
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="font-semibold text-gray-900 mb-3">אבטחה</h3>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    שנה סיסמה
                  </button>
                </div>

                <div className="pt-6 border-t">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    שמור שינויים
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

    </div>
  );
}
