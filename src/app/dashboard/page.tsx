'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  Home as HomeIcon, 
  FileText, 
  Plus, 
  User, 
  LogOut,
  TrendingUp,
  DollarSign,
  BarChart3,
  Settings,
  ChevronRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import MortgageCalculator from '@/components/mortgagecalculator';
import EquityPlanner from '@/components/ui/equitycalc';

type TabType = 'overview' | 'calculators' | 'my-mortgages' | 'settings';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mortgages, setMortgages] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'סקירה כללית', icon: HomeIcon },
    { id: 'calculators', label: 'מחשבונים', icon: Calculator },
    { id: 'my-mortgages', label: 'המשכנתאות שלי', icon: FileText },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <HomeIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl">Nadlanium</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium">{session.user?.name || session.user?.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                יציאה
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
            שלום, {session.user?.name || 'משתמש יקר'}!
          </h1>
          <p className="text-gray-600 mt-2">ברוך הבא למרכז הניהול האישי שלך</p>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-purple-600 border-b-2 border-purple-600'
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">סטטיסטיקות</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">חישובים שנשמרו</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">משכנתאות פעילות</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">מסמכים שהועלו</span>
                    <span className="font-semibold">0</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">פעולות מהירות</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('calculators')}
                    className="w-full flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium">חשב משכנתא</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-purple-600" />
                  </button>
                  <button
                    onClick={() => setActiveTab('my-mortgages')}
                    className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">התחל תהליך חדש</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">פעילות אחרונה</h3>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">אין פעילות אחרונה</p>
                </div>
              </div>
            </div>
          )}

          {/* Calculators Tab */}
          {activeTab === 'calculators' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-6">מחשבון משכנתא</h2>
                <MortgageCalculator />
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-6">מחשבון הון עצמי</h2>
                <EquityPlanner />
              </div>
            </div>
          )}

          {/* My Mortgages Tab */}
          {activeTab === 'my-mortgages' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">המשכנתאות שלי</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                  <Plus className="w-5 h-5" />
                  התחל תהליך חדש
                </button>
              </div>

              {mortgages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">אין משכנתאות פעילות</h3>
                  <p className="text-gray-600 mb-6">התחל תהליך חדש כדי לנהל את המשכנתא שלך</p>
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                    <Plus className="w-5 h-5" />
                    התחל תהליך חדש
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {/* Mortgage items will be displayed here */}
                </div>
              )}
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
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
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