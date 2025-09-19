'use client';

import NavBar from '@/components/ui/navbar';
import EquityPlanningTool from '@/components/ui/equity-planning-tool';

export default function EquityPlanningPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Navigation */}
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <NavBar />
      </div>
      
      <EquityPlanningTool />
    </div>
  );
}
