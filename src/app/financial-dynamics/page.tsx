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

  // Flow animation component
  const FlowAnimation = ({ from, to, amount, color, delay = 0 }: {
    from: string;
    to: string;
    amount: number;
    color: string;
    delay?: number;
  }) => {
    if (amount <= 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ delay, duration: 0.5 }}
        className={`absolute w-2 h-8 ${color} rounded-full opacity-70`}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          animate={{ y: [0, -20, -40] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full bg-current rounded-full"
        />
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
                <CardTitle>זרימת כסף אינטראקטיבית</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-80 bg-gradient-to-b from-blue-50 to-slate-50 rounded-lg p-6 overflow-hidden">
                  {/* Cash Flow Input */}
                  <motion.div
                    animate={{ scale: currentState?.monthlyFlow > 0 ? 1.1 : 0.9 }}
                    className="absolute top-4 left-1/2 transform -translate-x-1/2"
                  >
                    <div className={`px-4 py-2 rounded-lg text-white font-bold ${
                      currentState?.monthlyFlow > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      תזרים: {formatCurrency(currentState?.monthlyFlow || 0)}
                    </div>
                  </motion.div>

                  {/* Liquid Money Bar */}
                  <motion.div
                    className="absolute top-20 left-1/2 transform -translate-x-1/2 w-64 h-12 bg-blue-200 rounded-lg flex items-center justify-center relative overflow-hidden"
                    animate={{ 
                      backgroundColor: currentState?.liquid > 0 ? '#93c5fd' : '#fca5a5' 
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-blue-400 rounded-lg"
                      animate={{ 
                        width: `${Math.min(100, Math.max(10, (currentState?.liquid || 0) / 1000))}%`
                      }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative z-10 text-white font-bold">
                      נזיל: {formatCurrency(currentState?.liquid || 0)}
                    </span>
                  </motion.div>

                  {/* Three containers: Debt, Savings, Assets */}
                  <div className="absolute top-40 left-1/2 transform -translate-x-1/2 flex gap-8">
                    {/* Debt Container */}
                    <motion.div
                      className="w-20 h-32 bg-red-200 rounded-lg flex flex-col items-center justify-end p-2 relative overflow-hidden"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 bg-red-400 rounded-b-lg"
                        animate={{ 
                          height: `${Math.min(100, Math.max(10, ((currentState?.debt || 0) / 5000)))}%`
                        }}
                        transition={{ duration: 0.5 }}
                      />
                      <CreditCard className="w-6 h-6 text-white relative z-10 mb-1" />
                      <span className="text-xs text-white font-bold relative z-10">חוב</span>
                    </motion.div>

                    {/* Savings Container */}
                    <motion.div
                      className="w-20 h-32 bg-green-200 rounded-lg flex flex-col items-center justify-end p-2 relative overflow-hidden"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 bg-green-400 rounded-b-lg"
                        animate={{ 
                          height: `${Math.min(100, Math.max(10, ((currentState?.savings || 0) / 2000)))}%`
                        }}
                        transition={{ duration: 0.5 }}
                      />
                      <PiggyBank className="w-6 h-6 text-white relative z-10 mb-1" />
                      <span className="text-xs text-white font-bold relative z-10">חיסכון</span>
                    </motion.div>

                    {/* Assets Container */}
                    <motion.div
                      className="w-20 h-32 bg-purple-200 rounded-lg flex flex-col items-center justify-end p-2 relative overflow-hidden"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 bg-purple-400 rounded-b-lg"
                        animate={{ 
                          height: `${Math.min(100, Math.max(10, ((currentState?.assets || 0) / 3000)))}%`
                        }}
                        transition={{ duration: 0.5 }}
                      />
                      <Home className="w-6 h-6 text-white relative z-10 mb-1" />
                      <span className="text-xs text-white font-bold relative z-10">נכסים</span>
                    </motion.div>
                  </div>

                  {/* Wealth Bar */}
                  <motion.div
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-64 h-12 bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden"
                    animate={{ 
                      backgroundColor: (currentState?.wealth || 0) > 0 ? '#86efac' : '#fca5a5' 
                    }}
                  >
                    <motion.div
                      className={`absolute inset-0 rounded-lg ${
                        (currentState?.wealth || 0) > 0 ? 'bg-green-400' : 'bg-red-400'
                      }`}
                      animate={{ 
                        width: `${Math.min(100, Math.max(10, Math.abs(currentState?.wealth || 0) / 2000))}%`
                      }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative z-10 text-white font-bold">
                      עושר: {formatCurrency(currentState?.wealth || 0)}
                    </span>
                  </motion.div>

                  {/* Money Lost Indicator */}
                  <div className="absolute top-4 right-4">
                    <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm">
                      R⁻: {formatCurrency(currentState?.lost || 0)}
                    </div>
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