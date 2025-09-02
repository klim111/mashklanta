'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, DollarSign, Target, TrendingUp, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface MortgageDNAProps {
  preferences: {
    stability: number;
    flexibility: number;
    cost: number;
  };
  onUpdatePreferences: (prefs: { stability: number; flexibility: number; cost: number }) => void;
}

export function MortgageDNA({ preferences, onUpdatePreferences }: MortgageDNAProps) {
  // Calculate DNA profile based on preferences
  const getDNAProfile = () => {
    const { stability, flexibility, cost } = preferences;
    
    // Determine dominant trait
    const traits = [
      { name: 'stability', value: stability, label: 'יציבות' },
      { name: 'flexibility', value: flexibility, label: 'גמישות' },
      { name: 'cost', value: cost, label: 'עלות' }
    ];
    
    const dominant = traits.reduce((prev, current) => 
      prev.value > current.value ? prev : current
    );

    // Generate profile description
    let profileType = '';
    let description = '';
    let recommendedStructure = { prime: 0, fixed: 0, indexLinked: 0 };

    if (dominant.name === 'stability' && stability >= 4) {
      profileType = 'שמרן';
      description = 'מעדיף ביטחון ויציבות, רוצה לדעת בדיוק כמה ישלם כל חודש';
      recommendedStructure = { prime: 20, fixed: 60, indexLinked: 20 };
    } else if (dominant.name === 'flexibility' && flexibility >= 4) {
      profileType = 'גמיש';
      description = 'רוצה אפשרויות לשינוי ויכולת להסתגל לתנאים משתנים';
      recommendedStructure = { prime: 70, fixed: 10, indexLinked: 20 };
    } else if (dominant.name === 'cost' && cost >= 4) {
      profileType = 'חסכן';
      description = 'מחפש את העלות הנמוכה ביותר לטווח הארוך';
      recommendedStructure = { prime: 50, fixed: 30, indexLinked: 20 };
    } else {
      profileType = 'מאוזן';
      description = 'מחפש איזון בין יציבות, גמישות ועלות';
      recommendedStructure = { prime: 40, fixed: 40, indexLinked: 20 };
    }

    return { profileType, description, recommendedStructure };
  };

  const profile = getDNAProfile();

  // Prepare radar chart data
  const radarData = [
    { subject: 'יציבות', value: preferences.stability, fullMark: 5 },
    { subject: 'גמישות', value: preferences.flexibility, fullMark: 5 },
    { subject: 'עלות', value: preferences.cost, fullMark: 5 }
  ];

  const getProfileColor = (type: string) => {
    switch (type) {
      case 'שמרן': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'גמיש': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'חסכן': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getProfileIcon = (type: string) => {
    switch (type) {
      case 'שמרן': return Shield;
      case 'גמיש': return Zap;
      case 'חסכן': return DollarSign;
      default: return Target;
    }
  };

  const ProfileIcon = getProfileIcon(profile.profileType);

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">DNA משכנתא</h3>
            <p className="text-sm text-slate-600">הפרופיל האישי שלכם</p>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          מה זה?
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-800 text-center">מפת העדפות</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <PolarRadiusAxis 
                  domain={[0, 5]} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickCount={6}
                />
                <Radar
                  name="העדפות"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="space-y-4">
          {/* Profile Type */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
              <ProfileIcon className="w-8 h-8 text-white" />
            </div>
            <Badge className={`${getProfileColor(profile.profileType)} px-3 py-1 text-sm font-medium`}>
              פרופיל {profile.profileType}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-700 text-center leading-relaxed">
            {profile.description}
          </p>

          {/* Recommended Structure */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h5 className="font-medium text-slate-800 mb-3 text-center">
              התמהיל המומלץ עבורכם
            </h5>
            
            <div className="space-y-2">
              {/* Prime Rate */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">ריבית משתנה</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.recommendedStructure.prime}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-800 w-8">
                    {profile.recommendedStructure.prime}%
                  </span>
                </div>
              </div>

              {/* Fixed Rate */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">ריבית קבועה</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.recommendedStructure.fixed}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-800 w-8">
                    {profile.recommendedStructure.fixed}%
                  </span>
                </div>
              </div>

              {/* Index Linked */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">צמודת מדד</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-orange-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.recommendedStructure.indexLinked}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-800 w-8">
                    {profile.recommendedStructure.indexLinked}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
            onClick={() => {
              // Apply recommended structure
              onUpdatePreferences({
                ...preferences,
                recommendedStructure: profile.recommendedStructure
              });
            }}
          >
            החל את התמהיל המומלץ
          </Button>
        </div>
      </div>

      {/* Preference Sliders */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <h4 className="font-medium text-slate-800 mb-4">התאמת העדפות</h4>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Stability */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              יציבות
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={preferences.stability}
              onChange={(e) => onUpdatePreferences({
                ...preferences,
                stability: Number(e.target.value)
              })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>נמוך</span>
              <span>{preferences.stability}/5</span>
              <span>גבוה</span>
            </div>
          </div>

          {/* Flexibility */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              גמישות
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={preferences.flexibility}
              onChange={(e) => onUpdatePreferences({
                ...preferences,
                flexibility: Number(e.target.value)
              })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb-emerald"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>נמוך</span>
              <span>{preferences.flexibility}/5</span>
              <span>גבוה</span>
            </div>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              חשיבות העלות
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={preferences.cost}
              onChange={(e) => onUpdatePreferences({
                ...preferences,
                cost: Number(e.target.value)
              })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb-orange"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>נמוך</span>
              <span>{preferences.cost}/5</span>
              <span>גבוה</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}