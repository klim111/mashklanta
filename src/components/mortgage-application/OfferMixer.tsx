'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Shuffle, TrendingDown, Award, Calculator, DollarSign, Percent, GripVertical } from 'lucide-react';

interface MortgageTrack {
  id: string;
  bankName: string;
  trackType: 'prime' | 'variable' | 'fixed' | 'indexLinked';
  amount: number;
  interestRate: number;
  monthlyPayment: number;
  totalCost: number;
  features: string[];
  color: string;
}

interface BankOffer {
  id: string;
  bankName: string;
  logo: string;
  tracks: MortgageTrack[];
  totalMonthlyPayment: number;
  totalCost: number;
  rating: number;
}

// Sample data
const sampleOffers: BankOffer[] = [
  {
    id: 'bank-a',
    bankName: 'בנק הפועלים',
    logo: '🏦',
    rating: 4.2,
    tracks: [
      {
        id: 'poalim-prime',
        bankName: 'בנק הפועלים',
        trackType: 'prime',
        amount: 600000,
        interestRate: 1.75,
        monthlyPayment: 2850,
        totalCost: 855000,
        features: ['פירעון מוקדם ללא עמלה', 'הנחה ללקוחות VIP'],
        color: 'from-blue-500 to-blue-600'
      },
      {
        id: 'poalim-fixed',
        bankName: 'בנק הפועלים',
        trackType: 'fixed',
        amount: 400000,
        interestRate: 4.2,
        monthlyPayment: 2200,
        totalCost: 660000,
        features: ['ריבית קבועה 25 שנה', 'ביטוח חיים מוזל'],
        color: 'from-purple-500 to-purple-600'
      }
    ],
    totalMonthlyPayment: 5050,
    totalCost: 1515000
  },
  {
    id: 'bank-b',
    bankName: 'בנק לאומי',
    logo: '🏛️',
    rating: 4.0,
    tracks: [
      {
        id: 'leumi-variable',
        bankName: 'בנק לאומי',
        trackType: 'variable',
        amount: 500000,
        interestRate: 2.1,
        monthlyPayment: 2400,
        totalCost: 720000,
        features: ['ריבית משתנה אטרקטיבית', 'אופציה להמרה'],
        color: 'from-emerald-500 to-emerald-600'
      },
      {
        id: 'leumi-index',
        bankName: 'בנק לאומי',
        trackType: 'indexLinked',
        amount: 500000,
        interestRate: 3.8,
        monthlyPayment: 2750,
        totalCost: 825000,
        features: ['צמוד למדד המחירים', 'הגנה מאינפלציה'],
        color: 'from-amber-500 to-amber-600'
      }
    ],
    totalMonthlyPayment: 5150,
    totalCost: 1545000
  }
];

interface DraggableTrackProps {
  track: MortgageTrack;
  isDragging?: boolean;
}

function DraggableTrack({ track, isDragging }: DraggableTrackProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const trackTypeLabels = {
    prime: 'פריים',
    variable: 'משתנה',
    fixed: 'קבועה',
    indexLinked: 'צמוד מדד'
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
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        bg-white rounded-xl border border-slate-200 p-4 cursor-grab active:cursor-grabbing
        hover:shadow-md transition-all
        ${sortableIsDragging || isDragging ? 'shadow-lg scale-105 rotate-2' : ''}
      `}
      whileHover={{ y: -2 }}
      layout
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...listeners}
          className="mt-1 p-1 rounded hover:bg-slate-100 transition-colors"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>

        {/* Track Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${track.color}`} />
              <span className="font-medium text-slate-800">
                {trackTypeLabels[track.trackType]}
              </span>
              <span className="text-sm text-slate-500">
                {track.bankName}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-800">
              {formatCurrency(track.amount)}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800">
                {track.interestRate}%
              </div>
              <div className="text-xs text-slate-500">ריבית</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">
                {formatCurrency(track.monthlyPayment)}
              </div>
              <div className="text-xs text-slate-500">החזר חודשי</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">
                {formatCurrency(track.totalCost)}
              </div>
              <div className="text-xs text-slate-500">עלות כוללת</div>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1">
            {track.features.slice(0, 2).map((feature, index) => (
              <span
                key={index}
                className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface OfferMixerProps {
  offers?: BankOffer[];
}

export function OfferMixer({ offers = sampleOffers }: OfferMixerProps) {
  const [selectedTracks, setSelectedTracks] = useState<MortgageTrack[]>([]);
  const [activeOffer, setActiveOffer] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    // If dropping on the mixer area
    if (over.id === 'mixer-area') {
      const draggedTrack = offers
        .flatMap(offer => offer.tracks)
        .find(track => track.id === active.id);

      if (draggedTrack && !selectedTracks.find(t => t.id === draggedTrack.id)) {
        setSelectedTracks(prev => [...prev, draggedTrack]);
      }
    }
  };

  const removeTrack = (trackId: string) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const calculateMixedOffer = () => {
    const totalAmount = selectedTracks.reduce((sum, track) => sum + track.amount, 0);
    const totalMonthlyPayment = selectedTracks.reduce((sum, track) => sum + track.monthlyPayment, 0);
    const totalCost = selectedTracks.reduce((sum, track) => sum + track.totalCost, 0);
    const avgInterestRate = selectedTracks.reduce((sum, track) => 
      sum + (track.interestRate * track.amount), 0) / totalAmount || 0;

    return {
      totalAmount,
      totalMonthlyPayment,
      totalCost,
      avgInterestRate
    };
  };

  const findBestInCategory = () => {
    const allTracks = offers.flatMap(offer => offer.tracks);
    const bestByCategory = {
      lowestRate: allTracks.reduce((best, track) => 
        track.interestRate < best.interestRate ? track : best),
      lowestPayment: allTracks.reduce((best, track) => 
        track.monthlyPayment < best.monthlyPayment ? track : best),
      lowestTotal: allTracks.reduce((best, track) => 
        track.totalCost < best.totalCost ? track : best)
    };

    return bestByCategory;
  };

  const mixedOffer = calculateMixedOffer();
  const bestTracks = findBestInCategory();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
          <Shuffle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          מיקסר הצעות
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          גררו מסלולים מהצעות שונות לאזור המיקסר כדי ליצור את ההצעה המנצחת שלכם
        </p>
      </motion.div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Bank Offers */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold text-slate-800">
              הצעות הבנקים
            </h3>
            
            {offers.map((offer) => (
              <motion.div
                key={offer.id}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
              >
                {/* Bank Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{offer.logo}</span>
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {offer.bankName}
                      </h4>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-600">דירוג:</span>
                        <span className="text-sm font-medium text-amber-600">
                          {offer.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left">
                    <div className="text-lg font-bold text-slate-800">
                      {formatCurrency(offer.totalMonthlyPayment)}
                    </div>
                    <div className="text-sm text-slate-500">החזר חודשי</div>
                  </div>
                </div>

                {/* Tracks */}
                <SortableContext
                  items={offer.tracks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {offer.tracks.map((track) => (
                      <DraggableTrack key={track.id} track={track} />
                    ))}
                  </div>
                </SortableContext>
              </motion.div>
            ))}
          </div>

          {/* Mixer Area */}
          <div className="space-y-6">
            {/* Mixed Offer */}
            <motion.div
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-dashed border-indigo-300 p-6 min-h-[300px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="text-center mb-6">
                <Award className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="text-xl font-semibold text-slate-800">
                  ההצעה המנצחת שלכם
                </h3>
                <p className="text-sm text-slate-600">
                  גררו מסלולים לכאן
                </p>
              </div>

              {/* Drop Area */}
              <div
                id="mixer-area"
                className={`
                  min-h-[200px] rounded-xl border-2 border-dashed transition-all
                  ${selectedTracks.length > 0 
                    ? 'border-indigo-300 bg-white/50' 
                    : 'border-slate-300 bg-slate-50/50'
                  }
                `}
              >
                {selectedTracks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <Shuffle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">גררו מסלולים לכאן</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {selectedTracks.map((track) => (
                      <motion.div
                        key={track.id}
                        className="bg-white rounded-lg p-3 shadow-sm border border-slate-200"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        layout
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${track.color}`} />
                            <span className="text-sm font-medium">
                              {track.bankName}
                            </span>
                          </div>
                          <button
                            onClick={() => removeTrack(track.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {formatCurrency(track.amount)} • {track.interestRate}%
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mixed Offer Summary */}
              {selectedTracks.length > 0 && (
                <motion.div
                  className="mt-6 p-4 bg-white/70 rounded-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-indigo-600">
                        {formatCurrency(mixedOffer.totalMonthlyPayment)}
                      </div>
                      <div className="text-xs text-slate-600">החזר חודשי</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-indigo-600">
                        {mixedOffer.avgInterestRate.toFixed(2)}%
                      </div>
                      <div className="text-xs text-slate-600">ריבית ממוצעת</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Best in Category */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                הטובים ביותר בכל קטגוריה
              </h3>
              
              <div className="space-y-4">
                {[
                  { track: bestTracks.lowestRate, label: 'ריבית נמוכה', icon: Percent, color: 'text-emerald-600' },
                  { track: bestTracks.lowestPayment, label: 'החזר נמוך', icon: DollarSign, color: 'text-blue-600' },
                  { track: bestTracks.lowestTotal, label: 'עלות כוללת', icon: Calculator, color: 'text-purple-600' }
                ].map(({ track, label, icon: Icon, color }) => (
                  <div key={track.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">
                        {label}
                      </div>
                      <div className="text-xs text-slate-600">
                        {track.bankName}
                      </div>
                    </div>
                    <button
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                      onClick={() => {
                        if (!selectedTracks.find(t => t.id === track.id)) {
                          setSelectedTracks(prev => [...prev, track]);
                        }
                      }}
                    >
                      הוסף
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}