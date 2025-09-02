'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building, TrendingDown, TrendingUp, Award, GripVertical, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BankOffer {
  id: string;
  bankName: string;
  bankLogo?: string;
  tracks: MortgageTrack[];
  totalMonthlyPayment: number;
  totalCost: number;
  advantages: string[];
  disadvantages: string[];
}

interface MortgageTrack {
  id: string;
  type: 'prime' | 'fixed' | 'indexLinked';
  percentage: number;
  interestRate: number;
  monthlyPayment: number;
  period: number;
  amount: number;
}

interface OfferMixerProps {
  offers: BankOffer[];
  onOfferUpdate: (offers: BankOffer[]) => void;
}

// Mock data for demonstration
const mockOffers: BankOffer[] = [
  {
    id: 'bank-1',
    bankName: 'בנק הפועלים',
    tracks: [
      { id: 't1', type: 'prime', percentage: 50, interestRate: 5.25, monthlyPayment: 2850, period: 25, amount: 800000 },
      { id: 't2', type: 'fixed', percentage: 30, interestRate: 4.8, monthlyPayment: 1650, period: 20, amount: 480000 },
      { id: 't3', type: 'indexLinked', percentage: 20, interestRate: 2.1, monthlyPayment: 980, period: 30, amount: 320000 }
    ],
    totalMonthlyPayment: 5480,
    totalCost: 1644000,
    advantages: ['ריבית תחרותית', 'שירות מעולה', 'אישור מהיר'],
    disadvantages: ['עמלות גבוהות', 'תנאי יציאה קשיחים']
  },
  {
    id: 'bank-2',
    bankName: 'בנק לאומי',
    tracks: [
      { id: 't4', type: 'prime', percentage: 40, interestRate: 5.1, monthlyPayment: 2200, period: 25, amount: 640000 },
      { id: 't5', type: 'fixed', percentage: 40, interestRate: 4.9, monthlyPayment: 2150, period: 20, amount: 640000 },
      { id: 't6', type: 'indexLinked', percentage: 20, interestRate: 2.2, monthlyPayment: 1000, period: 30, amount: 320000 }
    ],
    totalMonthlyPayment: 5350,
    totalCost: 1605000,
    advantages: ['עמלות נמוכות', 'גמישות בתנאים', 'ייעוץ מקצועי'],
    disadvantages: ['ריבית גבוהה יותר', 'תהליך ארוך']
  },
  {
    id: 'bank-3',
    bankName: 'בנק דיסקונט',
    tracks: [
      { id: 't7', type: 'prime', percentage: 60, interestRate: 5.35, monthlyPayment: 3420, period: 25, amount: 960000 },
      { id: 't8', type: 'fixed', percentage: 25, interestRate: 4.7, monthlyPayment: 1320, period: 20, amount: 400000 },
      { id: 't9', type: 'indexLinked', percentage: 15, interestRate: 2.0, monthlyPayment: 720, period: 30, amount: 240000 }
    ],
    totalMonthlyPayment: 5460,
    totalCost: 1638000,
    advantages: ['ריבית פריים נמוכה', 'תנאי יציאה גמישים', 'מגוון מוצרים'],
    disadvantages: ['שירות לקוחות חלש', 'עמלות נסתרות']
  }
];

function SortableTrack({ track, onRemove }: { track: MortgageTrack; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTrackColor = (type: string) => {
    switch (type) {
      case 'prime': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'fixed': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'indexLinked': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  const getTrackName = (type: string) => {
    switch (type) {
      case 'prime': return 'פריים';
      case 'fixed': return 'קבועה';
      case 'indexLinked': return 'צמודת מדד';
      default: return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border-2 ${getTrackColor(track.type)} cursor-move relative group`}
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">{getTrackName(track.type)}</span>
            <Badge variant="outline" className="text-xs">
              {track.percentage}%
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-600">ריבית: </span>
              <span className="font-medium">{track.interestRate}%</span>
            </div>
            <div>
              <span className="text-slate-600">החזר: </span>
              <span className="font-medium">{formatCurrency(track.monthlyPayment)}</span>
            </div>
            <div>
              <span className="text-slate-600">תקופה: </span>
              <span className="font-medium">{track.period} שנים</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 text-xs"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function OfferMixer({ offers = mockOffers, onOfferUpdate }: OfferMixerProps) {
  const [selectedTracks, setSelectedTracks] = useState<MortgageTrack[]>([]);
  const [activeOffer, setActiveOffer] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelectedTracks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addTrack = (track: MortgageTrack) => {
    setSelectedTracks(prev => [...prev, { ...track, id: `${track.id}-${Date.now()}` }]);
  };

  const removeTrack = (trackId: string) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const calculateMixerTotals = () => {
    const totalMonthly = selectedTracks.reduce((sum, track) => sum + track.monthlyPayment, 0);
    const totalAmount = selectedTracks.reduce((sum, track) => sum + track.amount, 0);
    const averageRate = selectedTracks.length > 0 
      ? selectedTracks.reduce((sum, track) => sum + (track.interestRate * track.percentage / 100), 0)
      : 0;
    
    return { totalMonthly, totalAmount, averageRate };
  };

  const mixerTotals = calculateMixerTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBestInCategory = () => {
    const allTracks = offers.flatMap(offer => offer.tracks);
    
    const bestPrime = allTracks
      .filter(t => t.type === 'prime')
      .reduce((best, current) => current.interestRate < best.interestRate ? current : best);
    
    const bestFixed = allTracks
      .filter(t => t.type === 'fixed')
      .reduce((best, current) => current.interestRate < best.interestRate ? current : best);
    
    const bestIndexLinked = allTracks
      .filter(t => t.type === 'indexLinked')
      .reduce((best, current) => current.interestRate < best.interestRate ? current : best);

    return { bestPrime, bestFixed, bestIndexLinked };
  };

  const bestTracks = getBestInCategory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">
          מיקסר הצעות משכנתא
        </h2>
        <p className="text-slate-600">
          גררו מסלולים מכל הצעה כדי ליצור את הקומבינציה המנצחת
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bank Offers */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Building className="w-5 h-5" />
            הצעות הבנקים
          </h3>
          
          {offers.map((offer) => (
            <Card key={offer.id} className="p-4 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-slate-800">{offer.bankName}</h4>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>החזר: {formatCurrency(offer.totalMonthlyPayment)}</span>
                    <span>עלות כוללת: {formatCurrency(offer.totalCost)}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveOffer(activeOffer === offer.id ? null : offer.id)}
                >
                  {activeOffer === offer.id ? 'הסתר' : 'הצג פרטים'}
                </Button>
              </div>

              {/* Tracks */}
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                {offer.tracks.map((track) => (
                  <motion.div
                    key={track.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3 bg-slate-50 rounded-lg border-2 border-transparent hover:border-blue-300 cursor-pointer transition-all"
                    onClick={() => addTrack(track)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {track.type === 'prime' ? 'פריים' : track.type === 'fixed' ? 'קבועה' : 'צמודת מדד'}
                      </span>
                      <Plus className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-xs text-slate-600">
                      <div>{track.interestRate}% • {formatCurrency(track.monthlyPayment)}</div>
                      <div>{track.percentage}% מהמשכנתא</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Advantages/Disadvantages */}
              <AnimatePresence>
                {activeOffer === offer.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-slate-200 pt-4 grid md:grid-cols-2 gap-4"
                  >
                    <div>
                      <h5 className="font-medium text-emerald-800 mb-2 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        יתרונות
                      </h5>
                      <ul className="space-y-1">
                        {offer.advantages.map((advantage, index) => (
                          <li key={index} className="text-sm text-emerald-700 flex items-center gap-2">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                            {advantage}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-red-800 mb-2 flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" />
                        חסרונות
                      </h5>
                      <ul className="space-y-1">
                        {offer.disadvantages.map((disadvantage, index) => (
                          <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                            <div className="w-1 h-1 bg-red-500 rounded-full" />
                            {disadvantage}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>

        {/* Mixer Panel */}
        <div className="space-y-6">
          {/* Selected Tracks */}
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-emerald-50 border-blue-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              המיקס שלכם
            </h3>

            {selectedTracks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-8 h-8" />
                </div>
                <p className="text-sm">גררו מסלולים לכאן ליצירת המיקס המושלם</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={selectedTracks} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 mb-4">
                    {selectedTracks.map((track) => (
                      <SortableTrack
                        key={track.id}
                        track={track}
                        onRemove={() => removeTrack(track.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Totals */}
            {selectedTracks.length > 0 && (
              <div className="border-t border-blue-200 pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/60 rounded-lg p-3 text-center">
                    <div className="font-bold text-blue-800">
                      {formatCurrency(mixerTotals.totalMonthly)}
                    </div>
                    <div className="text-blue-600">החזר חודשי</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 text-center">
                    <div className="font-bold text-emerald-800">
                      {mixerTotals.averageRate.toFixed(2)}%
                    </div>
                    <div className="text-emerald-600">ריבית ממוצעת</div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Best in Category */}
          <Card className="p-4 bg-white/80">
            <h4 className="font-semibold text-slate-800 mb-3">הטובים ביותר בכל קטגוריה</h4>
            <div className="space-y-2">
              <div 
                className="p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => addTrack(bestTracks.bestPrime)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">פריים טוב ביותר</span>
                  <span className="text-sm text-blue-600">{bestTracks.bestPrime.interestRate}%</span>
                </div>
              </div>
              
              <div 
                className="p-2 bg-emerald-50 rounded cursor-pointer hover:bg-emerald-100 transition-colors"
                onClick={() => addTrack(bestTracks.bestFixed)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">קבועה טובה ביותר</span>
                  <span className="text-sm text-emerald-600">{bestTracks.bestFixed.interestRate}%</span>
                </div>
              </div>
              
              <div 
                className="p-2 bg-orange-50 rounded cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => addTrack(bestTracks.bestIndexLinked)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">צמודה טובה ביותר</span>
                  <span className="text-sm text-orange-600">{bestTracks.bestIndexLinked.interestRate}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}