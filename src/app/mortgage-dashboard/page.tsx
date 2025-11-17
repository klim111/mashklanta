'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home,
  ArrowLeft,
  RefreshCw,
  Download,
  Settings,
  HelpCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import UnifiedMortgageOverview from '@/components/dashboard/UnifiedMortgageOverview';
import { MortgageSummary, Payment } from '@/types/mortgage';
import { generateMockMortgageData } from '@/lib/mortgage-utils';

export default function MortgageDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [mortgageData, setMortgageData] = useState<MortgageSummary | null>(null);
  const [trackPayments, setTrackPayments] = useState<Record<string, Payment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load mortgage data
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    loadMortgageData();
  }, [session, status]);

  const loadMortgageData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In production, this would fetch from API
      // For now, using mock data
      const mockData = generateMockMortgageData();
      setMortgageData(mockData.summary);
      setTrackPayments(mockData.payments);
      
    } catch (err) {
      setError('שגיאה בטעינת נתוני המשכנתא');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefinance = (trackId: string) => {
    // Navigate to refinance tool with track data
    router.push(`/mortgage-advisor?trackId=${trackId}&mode=refinance`);
  };

  const exportMortgageData = () => {
    if (!mortgageData) return;
    
    const dataStr = JSON.stringify(mortgageData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mortgage_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען נתוני משכנתא...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">שגיאה</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadMortgageData}
            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (!mortgageData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">אין משכנתא פעילה</h2>
            <p className="text-gray-600 mb-6">
              נראה שעדיין לא הזנת פרטי משכנתא. התחל עכשיו כדי לנהל את המשכנתא שלך בצורה חכמה.
            </p>
            <Link href="/mortgage-application">
              <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                הוסף משכנתא
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
                <span>חזרה</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">דאשבורד משכנתא</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportMortgageData}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ייצוא נתונים"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/mortgage-advisor')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ייעוץ משכנתא"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="הגדרות"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Unified Mortgage Overview - All functionality in one component */}
        <UnifiedMortgageOverview
          mortgage={mortgageData}
          trackPayments={trackPayments}
          onRefinance={handleRefinance}
        />
      </div>
    </div>
  );
}
