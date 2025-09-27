'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown, DollarSign, PiggyBank, Home, CreditCard } from 'lucide-react';

// Types for our financial model
interface FinancialState {
  t: number;
  liquid: number;
  debt: number;
  savings: number;
  assets: number;
  wealth: number;
  lost: number;
  monthlyFlow: number;
}

interface FinancialInputs {
  // Initial values
  liquid0: number;
  debt0: number;
  savings0: number;
  assets0: number;
  
  // Monthly cash flow
  incomeMonthly: number;
  expenseMonthly: number;
  
  // Interest rates (APR)
  debtRateAPR: number;
  savingsRateAPR: number;
  assetsGrowthAPR: number;
  
  // Allocation rules (percentages)
  allocToDebt: number;
  allocToSavings: number;
  allocToAssets: number;
}

const defaultInputs: FinancialInputs = {
  liquid0: 50000,
  debt0: 200000,
  savings0: 30000,
  assets0: 100000,
  incomeMonthly: 15000,
  expenseMonthly: 12000,
  debtRateAPR: 4.5,
  savingsRateAPR: 2.5,
  assetsGrowthAPR: 6.0,
  allocToDebt: 50,
  allocToSavings: 30,
  allocToAssets: 20,
};

const MAX_MONTHS = 120; // 10 years

export default function FinancialDynamicsPage() {
  const [inputs, setInputs] = useState<FinancialInputs>(defaultInputs);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationData, setSimulationData] = useState<FinancialState[]>([]);
  const [hoveredData, setHoveredData] = useState<FinancialState | null>(null);

  // Calculate simulation data
  const calculateSimulation = useCallback((inputs: FinancialInputs): FinancialState[] => {
    const data: FinancialState[] = [];
    let liquid = inputs.liquid0;
    let debt = inputs.debt0;
    let savings = inputs.savings0;
    let assets = inputs.assets0;
    let totalLost = 0;

    for (let t = 0; t <= MAX_MONTHS; t++) {
      // Record current state
      const wealth = savings + assets - debt;
      const monthlyFlow = t === 0 ? 0 : inputs.incomeMonthly - inputs.expenseMonthly;
      
      data.push({
        t,
        liquid,
        debt,
        savings,
        assets,
        wealth,
        lost: totalLost,
        monthlyFlow,
      });

      if (t === MAX_MONTHS) break;

      // Monthly simulation step
      // 1. Add cash flow
      liquid += inputs.incomeMonthly - inputs.expenseMonthly;

      // 2. Calculate interest on debt
      const monthlyDebtRate = inputs.debtRateAPR / 100 / 12;
      const interestDebt = debt * monthlyDebtRate;

      // 3. Calculate allocations
      const availableLiquid = Math.max(0, liquid);
      const totalAllocationPercent = inputs.allocToDebt + inputs.allocToSavings + inputs.allocToAssets;
      
      let payDebt = 0;
      let paySavings = 0;
      let payAssets = 0;

      if (totalAllocationPercent > 0 && availableLiquid > 0) {
        payDebt = Math.min(availableLiquid * (inputs.allocToDebt / 100), availableLiquid);
        paySavings = Math.min(availableLiquid * (inputs.allocToSavings / 100), availableLiquid - payDebt);
        payAssets = Math.min(availableLiquid * (inputs.allocToAssets / 100), availableLiquid - payDebt - paySavings);
      }

      // 4. Process debt payment
      if (payDebt > 0) {
        if (payDebt >= interestDebt) {
          // Cover interest and reduce principal
          totalLost += interestDebt;
          debt = Math.max(0, debt - (payDebt - interestDebt));
        } else {
          // Only partial interest coverage
          totalLost += payDebt;
          debt += (interestDebt - payDebt); // Remaining interest adds to debt
        }
      } else {
        // No payment, debt grows by interest
        debt += interestDebt;
        totalLost += interestDebt;
      }

      // 5. Process savings
      savings += paySavings;
      const monthlySavingsRate = inputs.savingsRateAPR / 100 / 12;
      savings += savings * monthlySavingsRate;

      // 6. Process assets
      assets += payAssets;
      const monthlyAssetsRate = inputs.assetsGrowthAPR / 100 / 12;
      assets += assets * monthlyAssetsRate;

      // 7. Update liquid
      liquid -= (payDebt + paySavings + payAssets);
      liquid = Math.max(0, liquid); // Prevent negative liquid
    }

    return data;
  }, []);

  // Recalculate when inputs change
  useEffect(() => {
    const data = calculateSimulation(inputs);
    setSimulationData(data);
  }, [inputs, calculateSimulation]);

  // Animation logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentMonth < MAX_MONTHS) {
      interval = setInterval(() => {
        setCurrentMonth(prev => Math.min(prev + 1, MAX_MONTHS));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentMonth]);

  // Get current state for display
  const currentState = simulationData[currentMonth] || simulationData[0];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Enhanced flow animation components
  const WaterFlowAnimation = ({ isActive, direction = 'vertical', className = '' }: {
    isActive: boolean;
    direction?: 'vertical' | 'horizontal';
    className?: string;
  }) => {
    if (!isActive) return null;

    return (
      <motion.div className={`absolute ${className}`}>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-70"
            animate={direction === 'vertical' ? 
              { y: [0, 40, 80], opacity: [0.7, 0.5, 0] } :
              { x: [0, 40, 80], opacity: [0.7, 0.5, 0] }
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    );
  };

  const SavingsSegment = ({ amount, rate, index, totalSavings }: {
    amount: number;
    rate: number;
    index: number;
    totalSavings: number;
  }) => {
    const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500'];
    const borderColors = ['border-emerald-700', 'border-teal-700', 'border-cyan-700', 'border-sky-700', 'border-indigo-700'];
    const heightPercentage = totalSavings > 0 ? Math.min(95, Math.max(5, (amount / totalSavings) * 100)) : 5;
    
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: `${heightPercentage}%`,
          opacity: amount > 100 ? 1 : 0
        }}
        className={`w-full ${colors[index % colors.length]} ${borderColors[index % borderColors.length]} border-2 relative flex items-center justify-center`}
        transition={{ duration: 0.8, delay: index * 0.1 }}
      >
        {amount > 500 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="absolute inset-1 bg-white/20 rounded-sm flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-white drop-shadow-lg">
              {rate.toFixed(1)}%
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            דינמיקה פיננסית אינטראקטיבית
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            הדגמה בזמן אמת של זרימת כסף: תזרים → נזיל → {'{חוב, חיסכון, נכסים}'} → עושר
          </p>
        </motion.div>

        {/* Controls */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>בקרת סימולציה</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={isPlaying ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={currentMonth >= MAX_MONTHS}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'עצור' : 'הפעל'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentMonth(0);
                    setIsPlaying(false);
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  איפוס
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Time Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>חודש: {currentMonth}</Label>
                <Label className="text-sm text-gray-500">
                  שנה {Math.floor(currentMonth / 12)}.{currentMonth % 12}
                </Label>
              </div>
              <Slider
                value={[currentMonth]}
                onValueChange={([value]) => {
                  setCurrentMonth(value);
                  setIsPlaying(false);
                }}
                max={MAX_MONTHS}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle>פרמטרי קלט</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Initial Values */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">ערכי פתיחה</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="liquid0">כסף נזיל</Label>
                    <Input
                      id="liquid0"
                      type="number"
                      value={inputs.liquid0}
                      onChange={(e) => setInputs(prev => ({ ...prev, liquid0: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debt0">חוב</Label>
                    <Input
                      id="debt0"
                      type="number"
                      value={inputs.debt0}
                      onChange={(e) => setInputs(prev => ({ ...prev, debt0: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="savings0">חיסכון</Label>
                    <Input
                      id="savings0"
                      type="number"
                      value={inputs.savings0}
                      onChange={(e) => setInputs(prev => ({ ...prev, savings0: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assets0">נכסים</Label>
                    <Input
                      id="assets0"
                      type="number"
                      value={inputs.assets0}
                      onChange={(e) => setInputs(prev => ({ ...prev, assets0: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Monthly Cash Flow */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">תזרים חודשי</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="income">הכנסות</Label>
                    <Input
                      id="income"
                      type="number"
                      value={inputs.incomeMonthly}
                      onChange={(e) => setInputs(prev => ({ ...prev, incomeMonthly: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expenses">הוצאות</Label>
                    <Input
                      id="expenses"
                      type="number"
                      value={inputs.expenseMonthly}
                      onChange={(e) => setInputs(prev => ({ ...prev, expenseMonthly: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Interest Rates */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">ריביות שנתיות (%)</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>ריבית חוב: {formatPercent(inputs.debtRateAPR)}</Label>
                    <Slider
                      value={[inputs.debtRateAPR]}
                      onValueChange={([value]) => setInputs(prev => ({ ...prev, debtRateAPR: value }))}
                      min={0}
                      max={15}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ריבית חיסכון: {formatPercent(inputs.savingsRateAPR)}</Label>
                    <Slider
                      value={[inputs.savingsRateAPR]}
                      onValueChange={([value]) => setInputs(prev => ({ ...prev, savingsRateAPR: value }))}
                      min={0}
                      max={10}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תשואת נכסים: {formatPercent(inputs.assetsGrowthAPR)}</Label>
                    <Slider
                      value={[inputs.assetsGrowthAPR]}
                      onValueChange={([value]) => setInputs(prev => ({ ...prev, assetsGrowthAPR: value }))}
                      min={0}
                      max={15}
                      step={0.1}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Allocation Rules */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">חוקי הקצאה (%)</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>לחוב: {inputs.allocToDebt}%</Label>
                    <Slider
                      value={[inputs.allocToDebt]}
                      onValueChange={([value]) => setInputs(prev => ({ ...prev, allocToDebt: value }))}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>לחיסכון: {inputs.allocToSavings}%</Label>
                    <Slider
                      value={[inputs.allocToSavings]}
                      onValueChange={([value]) => setInputs(prev => ({ ...prev, allocToSavings: value }))}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>לנכסים: {inputs.allocToAssets}%</Label>
                    <Slider
                      value={[inputs.allocToAssets]}
                      onValueChange={([value]) => setInputs(prev => ({ ...prev, allocToAssets: value }))}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  סה"כ: {inputs.allocToDebt + inputs.allocToSavings + inputs.allocToAssets}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visualization Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Flow Visualization */}
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>זרימת כסף אינטראקטיבית</span>
                  <div className="text-sm text-gray-500">
                    חודש {currentMonth} / שנה {Math.floor(currentMonth / 12)}.{currentMonth % 12}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-96 bg-gradient-to-b from-slate-100 to-slate-50 rounded-lg p-8 overflow-hidden border-2 border-gray-200">
                  
                  {/* Vertical Cash Flow Pipe */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                    {/* Cash Flow Source */}
                    <motion.div
                      animate={{ scale: currentState?.monthlyFlow > 0 ? 1.05 : 0.95 }}
                      className="mb-2"
                    >
                      <div className={`px-6 py-3 rounded-t-lg text-white font-bold text-center ${
                        currentState?.monthlyFlow > 0 ? 'bg-emerald-600' : 'bg-red-600'
                      }`}>
                        תזרים מזומנים
                      </div>
                      <div className={`px-4 py-2 rounded-b-lg text-white font-bold text-center ${
                        currentState?.monthlyFlow > 0 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}>
                        {formatCurrency(currentState?.monthlyFlow || 0)}
                      </div>
                    </motion.div>

                    {/* Vertical Pipe */}
                    <div className="w-6 h-16 bg-gray-400 rounded-full relative mx-auto">
                      <WaterFlowAnimation 
                        isActive={Math.abs(currentState?.monthlyFlow || 0) > 0} 
                        direction="vertical"
                        className="left-1/2 transform -translate-x-1/2"
                      />
                    </div>
                  </div>

                  {/* Horizontal Liquid Money Bar */}
                  <div className="absolute top-24 left-1/2 transform -translate-x-1/2">
                    <motion.div
                      className="w-80 h-16 bg-slate-300 rounded-lg flex items-center relative overflow-hidden border-4 border-slate-400"
                      animate={{ 
                        borderColor: currentState?.liquid > 0 ? '#3b82f6' : '#ef4444' 
                      }}
                    >
                      <motion.div
                        className="absolute inset-1 bg-blue-500 rounded-md"
                        animate={{ 
                          width: `${Math.min(95, Math.max(5, (currentState?.liquid || 0) / 1000))}%`,
                          backgroundColor: currentState?.liquid > 0 ? '#3b82f6' : '#ef4444'
                        }}
                        transition={{ duration: 0.6 }}
                      />
                      <div className="relative z-10 w-full text-center">
                        <div className="text-white font-bold text-lg drop-shadow-lg">
                          כסף נזיל
                        </div>
                        <div className="text-white font-bold drop-shadow-lg">
                          {formatCurrency(currentState?.liquid || 0)}
                        </div>
                      </div>
                      
                      {/* Horizontal water flow animation */}
                      <WaterFlowAnimation 
                        isActive={Math.abs(currentState?.monthlyFlow || 0) > 0} 
                        direction="horizontal"
                        className="top-1/2 left-4 transform -translate-y-1/2"
                      />
                    </motion.div>
                  </div>

                  {/* Three Outgoing Pipes and Bars */}
                  <div className="absolute top-48 left-1/2 transform -translate-x-1/2 flex gap-16">
                    
                    {/* Debt Section with Split Flow */}
                    <div className="flex flex-col items-center relative">
                      {/* Main Connecting Pipe */}
                      <div className="w-4 h-8 bg-gray-400 rounded-full relative mb-2">
                        <WaterFlowAnimation 
                          isActive={(inputs.allocToDebt > 0 && currentState?.liquid > 0)} 
                          direction="vertical"
                          className="left-1/2 transform -translate-x-1/2"
                        />
                      </div>
                      
                      {/* Split Junction */}
                      <div className="relative mb-2">
                        <div className="w-6 h-4 bg-gray-400 rounded"></div>
                        
                        {/* Principal Payment Pipe (Left) */}
                        <div className="absolute -left-4 top-2 w-2 h-6 bg-green-400 rounded-full">
                          <WaterFlowAnimation 
                            isActive={(inputs.allocToDebt > 0 && currentState?.liquid > 0)} 
                            direction="vertical"
                            className="left-1/2 transform -translate-x-1/2"
                          />
                        </div>
                        
                        {/* Interest Payment Pipe (Right) */}
                        <div className="absolute -right-4 top-2 w-2 h-6 bg-orange-400 rounded-full">
                          <WaterFlowAnimation 
                            isActive={(inputs.allocToDebt > 0 && currentState?.liquid > 0)} 
                            direction="vertical"
                            className="left-1/2 transform -translate-x-1/2"
                          />
                        </div>
                      </div>
                      
                      {/* Debt Bar */}
                      <motion.div
                        className="w-24 h-32 bg-red-100 rounded-lg flex flex-col items-center justify-end p-2 relative overflow-hidden border-2 border-red-400"
                        whileHover={{ scale: 1.02 }}
                      >
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 bg-red-600 rounded-b-lg"
                          animate={{ 
                            height: `${Math.min(95, Math.max(5, ((currentState?.debt || 0) / 4000)))}%`
                          }}
                          transition={{ duration: 0.6 }}
                        />
                        <CreditCard className="w-6 h-6 text-white relative z-10 mb-1 drop-shadow" />
                        <span className="text-xs text-white font-bold relative z-10 text-center drop-shadow">
                          חוב<br/>{formatCurrency(currentState?.debt || 0)}
                        </span>
                      </motion.div>
                      
                      {/* Principal and Interest Labels */}
                      <div className="flex gap-8 mt-2 text-xs">
                        <div className="text-green-600 font-bold text-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mx-auto mb-1"></div>
                          קרן
                        </div>
                        <div className="text-orange-600 font-bold text-center">
                          <div className="w-2 h-2 bg-orange-400 rounded-full mx-auto mb-1"></div>
                          ריבית
                        </div>
                      </div>
                    </div>

                    {/* Savings Section with Segments */}
                    <div className="flex flex-col items-center">
                      {/* Connecting Pipe */}
                      <div className="w-4 h-8 bg-gray-400 rounded-full relative mb-2">
                        <WaterFlowAnimation 
                          isActive={(inputs.allocToSavings > 0 && currentState?.liquid > 0)} 
                          direction="vertical"
                          className="left-1/2 transform -translate-x-1/2"
                        />
                      </div>
                      
                      {/* Savings Bar with Segments */}
                      <motion.div
                        className="w-24 h-32 bg-green-100 rounded-lg relative overflow-hidden border-2 border-green-400"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="absolute bottom-0 left-0 right-0 flex flex-col-reverse h-full">
                          {/* Create multiple segments based on savings amount */}
                          {(() => {
                            const totalSavings = currentState?.savings || 0;
                            const segments = [];
                            const baseRate = inputs.savingsRateAPR;
                            
                            // Create up to 4 segments with different rates
                            const segmentCount = Math.min(4, Math.floor(totalSavings / 10000) + 1);
                            const amountPerSegment = totalSavings / segmentCount;
                            
                            for (let i = 0; i < segmentCount; i++) {
                              const rate = baseRate + (i * 0.5); // Increasing rates for newer deposits
                              segments.push(
                                <SavingsSegment
                                  key={i}
                                  amount={amountPerSegment}
                                  rate={rate}
                                  index={i}
                                  totalSavings={totalSavings}
                                />
                              );
                            }
                            return segments;
                          })()}
                        </div>
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20">
                          <PiggyBank className="w-6 h-6 text-white drop-shadow-lg" />
                          <span className="text-xs text-white font-bold text-center mt-1 drop-shadow-lg">
                            חיסכון<br/>{formatCurrency(currentState?.savings || 0)}
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Assets Section */}
                    <div className="flex flex-col items-center">
                      {/* Connecting Pipe */}
                      <div className="w-4 h-8 bg-gray-400 rounded-full relative mb-2">
                        <WaterFlowAnimation 
                          isActive={(inputs.allocToAssets > 0 && currentState?.liquid > 0)} 
                          direction="vertical"
                          className="left-1/2 transform -translate-x-1/2"
                        />
                      </div>
                      
                      {/* Assets Bar */}
                      <motion.div
                        className="w-24 h-32 bg-purple-100 rounded-lg flex flex-col items-center justify-end p-2 relative overflow-hidden border-2 border-purple-400"
                        whileHover={{ scale: 1.02 }}
                      >
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 bg-purple-600 rounded-b-lg"
                          animate={{ 
                            height: `${Math.min(95, Math.max(5, ((currentState?.assets || 0) / 3000)))}%`
                          }}
                          transition={{ duration: 0.6 }}
                        />
                        <Home className="w-6 h-6 text-white relative z-10 mb-1 drop-shadow" />
                        <span className="text-xs text-white font-bold relative z-10 text-center drop-shadow">
                          נכסים<br/>{formatCurrency(currentState?.assets || 0)}
                        </span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Lost Money Bar (replacing R⁻) */}
                  <div className="absolute bottom-16 right-8">
                    {/* Connection pipe from debt interest */}
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                      <div className="w-2 h-8 bg-orange-400 rounded-full relative">
                        <WaterFlowAnimation 
                          isActive={(inputs.allocToDebt > 0 && currentState?.liquid > 0)} 
                          direction="vertical"
                          className="left-1/2 transform -translate-x-1/2"
                        />
                      </div>
                      <div className="text-xs text-orange-600 font-bold text-center mt-1">
                        ריבית
                      </div>
                    </div>
                    
                    <motion.div
                      className="w-40 h-12 bg-orange-100 rounded-lg relative overflow-hidden border-2 border-orange-400 shadow-lg"
                      whileHover={{ scale: 1.05 }}
                      animate={{ 
                        boxShadow: (currentState?.lost || 0) > 0 ? '0 0 20px rgba(255, 165, 0, 0.3)' : '0 0 0px rgba(255, 165, 0, 0)'
                      }}
                    >
                      <motion.div
                        className="absolute inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-md"
                        animate={{ 
                          width: `${Math.min(95, Math.max(5, (currentState?.lost || 0) / 1000))}%`
                        }}
                        transition={{ duration: 0.6 }}
                      />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center text-white font-bold text-sm">
                        <div className="text-xs">כסף אבוד</div>
                        <div>{formatCurrency(currentState?.lost || 0)}</div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Wealth Indicator */}
                  <div className="absolute bottom-4 left-4">
                    <motion.div
                      className={`px-4 py-2 rounded-lg text-white font-bold ${
                        (currentState?.wealth || 0) > 0 ? 'bg-emerald-600' : 'bg-red-600'
                      }`}
                      animate={{ scale: (currentState?.wealth || 0) > 0 ? 1.05 : 0.95 }}
                    >
                      עושר כולל: {formatCurrency(currentState?.wealth || 0)}
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current State Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(currentState?.liquid || 0)}
                  </div>
                  <div className="text-sm text-blue-600">כסף נזיל</div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold text-red-900">
                    {formatCurrency(currentState?.debt || 0)}
                  </div>
                  <div className="text-sm text-red-600">חוב</div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <PiggyBank className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(currentState?.savings || 0)}
                  </div>
                  <div className="text-sm text-green-600">חיסכון</div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <Home className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-900">
                    {formatCurrency(currentState?.assets || 0)}
                  </div>
                  <div className="text-sm text-purple-600">נכסים</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <CardTitle>מגמות לאורך זמן</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simulationData.slice(0, currentMonth + 1)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="t" 
                        label={{ value: 'חודשים', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        labelFormatter={(label) => `חודש ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="wealth" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        name="עושר"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="liquid" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="נזיל"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="debt" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="חוב"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="savings" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        name="חיסכון"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="assets" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="נכסים"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lost" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="כסף אבוד (R⁻)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}