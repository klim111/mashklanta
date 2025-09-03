'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, Handshake, Settings, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MortgageState } from '@/app/mortgage-advisor/page';
import { ZoomableJourney } from './ZoomableJourney';
import { StageCard } from './StageCard';
import { MortgageDNA } from './MortgageDNA';
import { OfferMixer } from './OfferMixer';
import { InterestShockSimulation } from './InterestShockSimulation';

interface ProModeProps {
  state: MortgageState;
  updateState: (updates: Partial<MortgageState>) => void;
  onAddHint: (hintId: string) => void;
}

interface StageData {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  current: boolean;
  cards: any[];
}

export function ProMode({ state, updateState, onAddHint }: ProModeProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [compactMode, setCompactMode] = useState(false);

  const stages: StageData[] = [
    {
      id: 'characterization',
      title: 'הכרת הלקוח',
      description: 'בניית פרופיל כלכלי ואישי מקיף',
      icon: Users,
      completed: state.milestones.characterization,
      current: !state.milestones.characterization,
      cards: [
        {
          id: 'personal-info',
          title: 'פרטים אישיים',
          description: 'גיל, מצב משפחתי, מקום מגורים',
          cta: 'מלא פרטים',
          requirements: ['תעודת זהות', 'אישור מקום מגורים'],
          completed: false
        },
        {
          id: 'financial-status',
          title: 'מצב כלכלי',
          description: 'הכנסות, הוצאות, הון עצמי',
          cta: 'חשב יכולת',
          requirements: ['תלושי משכורת', 'אישור בנק'],
          completed: false
        },
        {
          id: 'preferences',
          title: 'העדפות השקעה',
          description: 'פרופיל סיכון ויעדים',
          cta: 'הגדר העדפות',
          requirements: [],
          completed: false
        }
      ]
    },
    {
      id: 'structure-building',
      title: 'בניית תמהיל',
      description: 'הרכב המשכנתא המותאמת אישית',
      icon: Building2,
      completed: state.milestones.structureBuilding,
      current: state.milestones.characterization && !state.milestones.structureBuilding,
      cards: [
        {
          id: 'property-details',
          title: 'פרטי הנכס',
          description: 'מחיר, מיקום, סוג נכס',
          cta: 'הגדר נכס',
          requirements: ['הסכם רכישה', 'שמאות'],
          completed: false
        },
        {
          id: 'mortgage-structure',
          title: 'מבנה המשכנתא',
          description: 'חלוקה בין מסלולים',
          cta: 'בנה תמהיל',
          requirements: [],
          completed: false
        },
        {
          id: 'optimization',
          title: 'אופטימיזציה',
          description: 'התאמת התמהיל לפרופיל',
          cta: 'אמת תמהיל',
          requirements: [],
          completed: false
        }
      ]
    },
    {
      id: 'bank-negotiation',
      title: 'מו"מ בנקים',
      description: 'קבלת הצעות, השוואה ומשא ומתן',
      icon: Handshake,
      completed: state.milestones.bankNegotiation,
      current: state.milestones.structureBuilding && !state.milestones.bankNegotiation,
      cards: [
        {
          id: 'preliminary-approval',
          title: 'אישור עקרוני',
          description: 'הגשת בקשות לבנקים',
          cta: 'הגש בקשות',
          requirements: ['מסמכים מלאים', 'שמאות מאושרת'],
          completed: false
        },
        {
          id: 'offers-comparison',
          title: 'השוואת הצעות',
          description: 'ניתוח והשוואת תנאים',
          cta: 'השווה הצעות',
          requirements: ['הצעות בנקים'],
          completed: false
        },
        {
          id: 'negotiation',
          title: 'משא ומתן',
          description: 'שיפור תנאים וחתימה',
          cta: 'נהל משא ומתן',
          requirements: ['החלטה על בנק מועדף'],
          completed: false
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-bl from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                דשבורד משכנתא מקצועי
              </h1>
              <p className="text-slate-600">שליטה מלאה על כל שלבי התהליך</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompactMode(!compactMode)}
                className="flex items-center gap-2"
              >
                {compactMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {compactMode ? 'הצג הכל' : 'מצב קומפקטי'}
              </Button>
              
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                הגדרות
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Journey Map */}
        <div className="mb-8">
          <ZoomableJourney
            currentStep={state.currentStep}
            onStepClick={() => {}}
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80">
            <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
            <TabsTrigger value="analysis">ניתוח ותמהיל</TabsTrigger>
            <TabsTrigger value="offers">השוואת הצעות</TabsTrigger>
            <TabsTrigger value="simulation">סימולציות</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {stages.map((stage, stageIndex) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stageIndex * 0.1 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 overflow-hidden">
                  {/* Stage Header */}
                  <div className={`
                    p-6 border-b border-slate-200
                    ${stage.completed 
                      ? 'bg-emerald-50' 
                      : stage.current 
                        ? 'bg-blue-50' 
                        : 'bg-slate-50'
                    }
                  `}>
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        ${stage.completed 
                          ? 'bg-emerald-500 text-white' 
                          : stage.current 
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-300 text-slate-600'
                        }
                      `}>
                        <stage.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-slate-800">
                          {stage.title}
                        </h2>
                        <p className="text-slate-600">{stage.description}</p>
                      </div>
                      <div className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${stage.completed 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : stage.current 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }
                      `}>
                        {stage.completed ? 'הושלם' : stage.current ? 'בעבודה' : 'ממתין'}
                      </div>
                    </div>
                  </div>

                  {/* Stage Cards */}
                  {!compactMode && (
                    <div className="p-6">
                      <div className="grid md:grid-cols-3 gap-4">
                        {stage.cards.map((card, cardIndex) => (
                          <StageCard
                            key={card.id}
                            card={card}
                            onAction={() => {}}
                            delay={cardIndex * 0.05}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* DNA Profile */}
              <MortgageDNA
                preferences={state.preferences}
                onUpdatePreferences={(prefs) => updateState({ preferences: prefs })}
              />

              {/* Structure Builder */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  מבנה המשכנתא
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ריבית משתנה (פריים)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={state.mortgageStructure.primeRate}
                        onChange={(e) => updateState({
                          mortgageStructure: {
                            ...state.mortgageStructure,
                            primeRate: Number(e.target.value)
                          }
                        })}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm font-medium text-slate-800">
                        {state.mortgageStructure.primeRate}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ריבית קבועה
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={state.mortgageStructure.fixedRate}
                        onChange={(e) => updateState({
                          mortgageStructure: {
                            ...state.mortgageStructure,
                            fixedRate: Number(e.target.value)
                          }
                        })}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm font-medium text-slate-800">
                        {state.mortgageStructure.fixedRate}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      צמודת מדד
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={state.mortgageStructure.indexLinked}
                        onChange={(e) => updateState({
                          mortgageStructure: {
                            ...state.mortgageStructure,
                            indexLinked: Number(e.target.value)
                          }
                        })}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm font-medium text-slate-800">
                        {state.mortgageStructure.indexLinked}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-6">
            <OfferMixer
              offers={[]} // Would be populated with actual offers
              onOfferUpdate={() => {}}
            />
          </TabsContent>

          {/* Simulation Tab */}
          <TabsContent value="simulation" className="space-y-6">
            <InterestShockSimulation
              mortgageStructure={state.mortgageStructure}
              onShockTest={(results) => {
                onAddHint('optimization-opportunity');
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}