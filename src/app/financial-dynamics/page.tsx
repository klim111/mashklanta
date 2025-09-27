'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play, Pause, RotateCcw, TrendingUp, TrendingDown,
  DollarSign, Wallet, PiggyBank, Home, AlertCircle,
  Activity, ChevronLeft, Settings, Info, Download, Upload
} from 'lucide-react';
import Link from 'next/link';

// Types
interface FinancialParams {
  liquid0: number;
  debt0: number;
  savings0: number;
  assets0: number;
  incomeMonthly: number;
  expenseMonthly: number;
  debtRateAPR: number;
  savingsRateAPR: number;
  assetsGrowthAPR: number;
  allocToDebt: number;
  allocToSavings: number;
  allocToAssets: number;
  maxMonths?: number;
}

interface TimelineState {
  month: number;
  liquid: number;
  debt: number;
  savings: number;
  assets: number;
  wealth: number;
  lost: number;
  netCashFlow: number;
  debtPayment: number;
  savingsDeposit: number;
  assetsInvestment: number;
  debtInterest: number;
  savingsInterest: number;
  assetsGrowth: number;
}

// Financial calculation engine
class FinancialEngine {
  params: FinancialParams;
  timeline: TimelineState[];

  constructor(params: FinancialParams) {
    this.params = params;
    this.timeline = [];
    this.calculateTimeline();
  }

  calculateTimeline() {
    const {
      liquid0, debt0, savings0, assets0,
      incomeMonthly, expenseMonthly,
      debtRateAPR, savingsRateAPR, assetsGrowthAPR,
      allocToDebt, allocToSavings, allocToAssets,
      maxMonths = 360
    } = this.params;

    this.timeline = [];
    
    let liquid = liquid0;
    let debt = debt0;
    let savings = savings0;
    let assets = assets0;
    let lostCumulative = 0;

    // Initial state
    this.timeline.push({
      month: 0,
      liquid,
      debt,
      savings,
      assets,
      wealth: savings + assets - debt,
      lost: lostCumulative,
      netCashFlow: 0,
      debtPayment: 0,
      savingsDeposit: 0,
      assetsInvestment: 0,
      debtInterest: 0,
      savingsInterest: 0,
      assetsGrowth: 0
    });

    for (let t = 1; t <= maxMonths; t++) {
      // Step 1: Cash flow
      const netCashFlow = incomeMonthly - expenseMonthly;
      liquid += netCashFlow;

      // Step 2: Calculate interest/growth
      const debtInterest = debt * (debtRateAPR / 100 / 12);
      const savingsInterest = savings * (savingsRateAPR / 100 / 12);
      const assetsGrowth = assets * (assetsGrowthAPR / 100 / 12);

      // Step 3: Allocations (ensure we don't go negative)
      const availableLiquid = Math.max(0, liquid);
      
      // Calculate actual allocations based on available liquid
      let actualDebtPayment = Math.min(allocToDebt, availableLiquid);
      let remainingLiquid = availableLiquid - actualDebtPayment;
      
      let actualSavingsDeposit = Math.min(allocToSavings, remainingLiquid);
      remainingLiquid -= actualSavingsDeposit;
      
      let actualAssetsInvestment = Math.min(allocToAssets, remainingLiquid);
      
      // Step 4: Process debt payment (R- calculation)
      if (actualDebtPayment > 0) {
        if (actualDebtPayment >= debtInterest) {
          // Payment covers interest + principal
          lostCumulative += debtInterest; // Interest is "lost" money (R-)
          debt = Math.max(0, debt - (actualDebtPayment - debtInterest));
        } else {
          // Payment only partially covers interest
          lostCumulative += actualDebtPayment;
          debt += (debtInterest - actualDebtPayment); // Debt grows
        }
      } else {
        // No payment, debt grows by interest
        debt += debtInterest;
      }

      // Step 5: Update savings (R+)
      savings += actualSavingsDeposit + savingsInterest;

      // Step 6: Update assets
      assets += actualAssetsInvestment + assetsGrowth;

      // Step 7: Update liquid after allocations
      liquid -= (actualDebtPayment + actualSavingsDeposit + actualAssetsInvestment);

      // Calculate wealth
      const wealth = savings + assets - debt;

      // Store timeline data
      this.timeline.push({
        month: t,
        liquid: Math.round(liquid),
        debt: Math.round(debt),
        savings: Math.round(savings),
        assets: Math.round(assets),
        wealth: Math.round(wealth),
        lost: Math.round(lostCumulative),
        netCashFlow: Math.round(netCashFlow),
        debtPayment: Math.round(actualDebtPayment),
        savingsDeposit: Math.round(actualSavingsDeposit),
        assetsInvestment: Math.round(actualAssetsInvestment),
        debtInterest: Math.round(debtInterest),
        savingsInterest: Math.round(savingsInterest),
        assetsGrowth: Math.round(assetsGrowth)
      });

      // Stop if debt is paid off and we're in a stable state
      if (debt === 0 && t > 12) {
        // Continue for a few more months to show stability
        for (let stabilityMonth = 1; stabilityMonth <= 6; stabilityMonth++) {
          const stableNetCashFlow = incomeMonthly - expenseMonthly;
          liquid += stableNetCashFlow;
          
          const stableSavingsInterest = savings * (savingsRateAPR / 100 / 12);
          const stableAssetsGrowth = assets * (assetsGrowthAPR / 100 / 12);
          
          const stableAvailableLiquid = Math.max(0, liquid);
          const stableSavingsDeposit = Math.min(allocToSavings, stableAvailableLiquid);
          const stableAssetsInvestment = Math.min(allocToAssets, stableAvailableLiquid - stableSavingsDeposit);
          
          savings += stableSavingsDeposit + stableSavingsInterest;
          assets += stableAssetsInvestment + stableAssetsGrowth;
          liquid -= (stableSavingsDeposit + stableAssetsInvestment);
          
          this.timeline.push({
            month: t + stabilityMonth,
            liquid: Math.round(liquid),
            debt: 0,
            savings: Math.round(savings),
            assets: Math.round(assets),
            wealth: Math.round(savings + assets),
            lost: Math.round(lostCumulative),
            netCashFlow: Math.round(stableNetCashFlow),
            debtPayment: 0,
            savingsDeposit: Math.round(stableSavingsDeposit),
            assetsInvestment: Math.round(stableAssetsInvestment),
            debtInterest: 0,
            savingsInterest: Math.round(stableSavingsInterest),
            assetsGrowth: Math.round(stableAssetsGrowth)
          });
        }
        break;
      }
    }
  }

  getStateAt(month: number): TimelineState {
    const index = Math.min(month, this.timeline.length - 1);
    return this.timeline[index];
  }

  getTimeline(): TimelineState[] {
    return this.timeline;
  }
}

// Flow animation component
interface FlowAnimationProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  amount: number;
  color: string;
  label?: string;
  isActive: boolean;
}

const FlowAnimation: React.FC<FlowAnimationProps> = ({ from, to, amount, color, label, isActive }) => {
  if (!isActive || amount <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 pointer-events-none"
    >
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={`gradient-${from}-${to}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="50%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <motion.path
          d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 50} ${to.x} ${to.y}`}
          stroke={`url(#gradient-${from}-${to})`}
          strokeWidth={Math.max(2, Math.min(10, amount / 1000))}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      {label && (
        <motion.div
          className="absolute text-xs font-semibold"
          style={{
            left: `${(from.x + to.x) / 2}px`,
            top: `${Math.min(from.y, to.y) - 60}px`,
            color,
            transform: 'translateX(-50%)'
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          ₪{amount.toLocaleString()}
        </motion.div>
      )}
    </motion.div>
  );
};

// Money container visualization
interface MoneyContainerProps {
  title: string;
  amount: number;
  maxAmount: number;
  color: string;
  icon: React.ElementType;
  trend?: number;
  highlight?: boolean;
}

const MoneyContainer: React.FC<MoneyContainerProps> = ({ title, amount, maxAmount, color, icon: Icon, trend, highlight }) => {
  const fillPercentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative bg-white rounded-2xl shadow-lg border-2 ${highlight ? 'border-blue-400' : 'border-gray-200'} p-4 h-48`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        {trend !== undefined && trend !== 0 && (
          <Badge variant={trend > 0 ? "default" : "destructive"} className="text-xs">
            {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}%
          </Badge>
        )}
      </div>
      
      <div className="relative h-24 bg-gray-100 rounded-xl overflow-hidden">
        <motion.div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${color} opacity-80`}
          initial={{ height: 0 }}
          animate={{ height: `${fillPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            ₪{amount.toLocaleString()}
          </span>
        </div>
      </div>
      
      {highlight && (
        <motion.div
          className="absolute -inset-1 rounded-2xl bg-blue-400 opacity-20"
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

export default function FinancialDynamicsPage() {
  // State management
  const [currentMonth, setCurrentMonth] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [viewMode, setViewMode] = useState('visualization'); // 'visualization' | 'charts' | 'data'
  
  // Input parameters
  const [params, setParams] = useState({
    // Initial values
    liquid0: 50000,
    debt0: 500000,
    savings0: 100000,
    assets0: 200000,
    
    // Monthly cash flow
    incomeMonthly: 25000,
    expenseMonthly: 15000,
    
    // Interest rates (APR)
    debtRateAPR: 5.5,
    savingsRateAPR: 3.5,
    assetsGrowthAPR: 7.0,
    
    // Allocation rules
    allocToDebt: 5000,
    allocToSavings: 2000,
    allocToAssets: 1000,
    
    // Simulation settings
    maxMonths: 360
  });

  // Calculate financial timeline
  const engine = useMemo(() => new FinancialEngine(params), [params]);
  const timeline = engine.getTimeline();
  const currentState = timeline[Math.min(currentMonth, timeline.length - 1)];
  
  // Animation control
  useEffect(() => {
    if (isPlaying && currentMonth < timeline.length - 1) {
      const timer = setTimeout(() => {
        setCurrentMonth(prev => Math.min(prev + 1, timeline.length - 1));
      }, 1000 / playSpeed);
      return () => clearTimeout(timer);
    } else if (currentMonth >= timeline.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentMonth, timeline.length, playSpeed]);

  // Handlers
  const handleParamChange = useCallback((key: keyof FinancialParams, value: string) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setCurrentMonth(0); // Reset timeline when params change
  }, []);

  const handleReset = () => {
    setCurrentMonth(0);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ params, timeline }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'financial-simulation.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Chart data preparation
  const chartData = timeline.slice(0, Math.max(currentMonth + 1, 12)).map(state => ({
    month: state.month,
    נזיל: state.liquid,
    חוב: -state.debt,
    חיסכון: state.savings,
    נכסים: state.assets,
    עושר: state.wealth,
    'כסף אבוד': -state.lost
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  חזרה
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900">דינמיקה פיננסית</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                ייצוא
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'visualization' ? 'charts' : 'visualization')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {viewMode === 'visualization' ? 'גרפים' : 'ויזואליזציה'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Input Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>פרמטרים פיננסיים</CardTitle>
                <CardDescription>הגדר את הערכים ההתחלתיים והתזרים החודשי</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="initial" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="initial">התחלה</TabsTrigger>
                    <TabsTrigger value="flow">תזרים</TabsTrigger>
                    <TabsTrigger value="rates">ריביות</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="initial" className="space-y-3">
                    <div>
                      <Label htmlFor="liquid0">כסף נזיל</Label>
                      <Input
                        id="liquid0"
                        type="number"
                        value={params.liquid0}
                        onChange={(e) => handleParamChange('liquid0', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="debt0">חוב התחלתי</Label>
                      <Input
                        id="debt0"
                        type="number"
                        value={params.debt0}
                        onChange={(e) => handleParamChange('debt0', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="savings0">חיסכון התחלתי</Label>
                      <Input
                        id="savings0"
                        type="number"
                        value={params.savings0}
                        onChange={(e) => handleParamChange('savings0', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="assets0">נכסים התחלתיים</Label>
                      <Input
                        id="assets0"
                        type="number"
                        value={params.assets0}
                        onChange={(e) => handleParamChange('assets0', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="flow" className="space-y-3">
                    <div>
                      <Label htmlFor="income">הכנסה חודשית</Label>
                      <Input
                        id="income"
                        type="number"
                        value={params.incomeMonthly}
                        onChange={(e) => handleParamChange('incomeMonthly', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expense">הוצאות חודשיות</Label>
                      <Input
                        id="expense"
                        type="number"
                        value={params.expenseMonthly}
                        onChange={(e) => handleParamChange('expenseMonthly', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allocDebt">הקצאה לחוב</Label>
                      <Input
                        id="allocDebt"
                        type="number"
                        value={params.allocToDebt}
                        onChange={(e) => handleParamChange('allocToDebt', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allocSavings">הקצאה לחיסכון</Label>
                      <Input
                        id="allocSavings"
                        type="number"
                        value={params.allocToSavings}
                        onChange={(e) => handleParamChange('allocToSavings', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allocAssets">הקצאה לנכסים</Label>
                      <Input
                        id="allocAssets"
                        type="number"
                        value={params.allocToAssets}
                        onChange={(e) => handleParamChange('allocToAssets', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="rates" className="space-y-3">
                    <div>
                      <Label htmlFor="debtRate">ריבית חוב (APR %)</Label>
                      <Input
                        id="debtRate"
                        type="number"
                        step="0.1"
                        value={params.debtRateAPR}
                        onChange={(e) => handleParamChange('debtRateAPR', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="savingsRate">ריבית חיסכון (APR %)</Label>
                      <Input
                        id="savingsRate"
                        type="number"
                        step="0.1"
                        value={params.savingsRateAPR}
                        onChange={(e) => handleParamChange('savingsRateAPR', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="assetsGrowth">תשואת נכסים (APR %)</Label>
                      <Input
                        id="assetsGrowth"
                        type="number"
                        step="0.1"
                        value={params.assetsGrowthAPR}
                        onChange={(e) => handleParamChange('assetsGrowthAPR', e.target.value)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Timeline Control */}
            <Card>
              <CardHeader>
                <CardTitle>בקרת זמן</CardTitle>
                <CardDescription>חודש {currentMonth} מתוך {timeline.length - 1}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Slider
                    value={[currentMonth]}
                    onValueChange={([value]) => setCurrentMonth(value)}
                    max={timeline.length - 1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>התחלה</span>
                    <span>{Math.floor((timeline.length - 1) / 12)} שנים</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    איפוס
                  </Button>
                  <Button
                    variant={isPlaying ? "destructive" : "default"}
                    size="sm"
                    onClick={handlePlayPause}
                    className="flex-1"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        עצור
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        הפעל
                      </>
                    )}
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="speed">מהירות הפעלה</Label>
                  <Slider
                    id="speed"
                    value={[playSpeed]}
                    onValueChange={([value]) => setPlaySpeed(value)}
                    min={0.5}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="text-center text-xs text-gray-500 mt-1">
                    x{playSpeed}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>מדדים מרכזיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">עושר נטו</span>
                  <span className={`text-lg font-bold ${currentState.wealth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₪{currentState.wealth.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">כסף אבוד (R-)</span>
                  <span className="text-lg font-bold text-red-600">
                    ₪{currentState.lost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">תזרים נטו</span>
                  <span className={`text-lg font-bold ${currentState.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₪{currentState.netCashFlow.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="lg:col-span-2 space-y-6">
            {viewMode === 'visualization' ? (
              <>
                {/* Flow Visualization */}
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>זרימת כסף בזמן אמת</CardTitle>
                    <CardDescription>
                      ויזואליזציה של תנועת הכסף בין השכבות השונות
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-96 bg-gradient-to-b from-blue-50 to-white rounded-xl p-4">
                      {/* Income Flow */}
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                        <motion.div
                          className="bg-green-100 border-2 border-green-400 rounded-xl px-4 py-2"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-800">
                              הכנסה: ₪{params.incomeMonthly.toLocaleString()}
                            </span>
                          </div>
                        </motion.div>
                      </div>

                      {/* Liquid Container */}
                      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-48">
                        <MoneyContainer
                          title="כסף נזיל"
                          amount={currentState.liquid}
                          maxAmount={200000}
                          color="from-blue-500 to-blue-600"
                          icon={Wallet}
                          highlight={true}
                        />
                      </div>

                      {/* Bottom Containers */}
                      <div className="absolute bottom-4 left-0 right-0 grid grid-cols-3 gap-4 px-4">
                        <MoneyContainer
                          title="חוב"
                          amount={currentState.debt}
                          maxAmount={params.debt0}
                          color="from-red-500 to-red-600"
                          icon={TrendingDown}
                          trend={currentState.debtPayment > 0 ? -5 : 0}
                        />
                        <MoneyContainer
                          title="חיסכון (R+)"
                          amount={currentState.savings}
                          maxAmount={500000}
                          color="from-green-500 to-green-600"
                          icon={PiggyBank}
                          trend={currentState.savingsInterest > 0 ? 3.5 : 0}
                        />
                        <MoneyContainer
                          title="נכסים"
                          amount={currentState.assets}
                          maxAmount={1000000}
                          color="from-purple-500 to-purple-600"
                          icon={Home}
                          trend={currentState.assetsGrowth > 0 ? 7 : 0}
                        />
                      </div>

                      {/* Flow Animations */}
                      <AnimatePresence>
                        {currentState.debtPayment > 0 && (
                          <FlowAnimation
                            from={{ x: 240, y: 200 }}
                            to={{ x: 100, y: 320 }}
                            amount={currentState.debtPayment}
                            color="#ef4444"
                            label="לחוב"
                            isActive={true}
                          />
                        )}
                        {currentState.savingsDeposit > 0 && (
                          <FlowAnimation
                            from={{ x: 240, y: 200 }}
                            to={{ x: 240, y: 320 }}
                            amount={currentState.savingsDeposit}
                            color="#10b981"
                            label="לחיסכון"
                            isActive={true}
                          />
                        )}
                        {currentState.assetsInvestment > 0 && (
                          <FlowAnimation
                            from={{ x: 240, y: 200 }}
                            to={{ x: 380, y: 320 }}
                            amount={currentState.assetsInvestment}
                            color="#8b5cf6"
                            label="לנכסים"
                            isActive={true}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>

                {/* Wealth and Lost Money Indicators */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">עושר כולל</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        ₪{currentState.wealth.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        חיסכון + נכסים - חוב
                      </p>
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>חיסכון</span>
                          <span className="font-medium">₪{currentState.savings.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>נכסים</span>
                          <span className="font-medium">₪{currentState.assets.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>חוב</span>
                          <span className="font-medium text-red-600">-₪{currentState.debt.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">כסף אבוד (R-)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">
                        ₪{currentState.lost.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        ריבית ששולמה על חובות
                      </p>
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          כסף זה "אבוד" כי הוא משלם ריבית ולא מקטין קרן
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              /* Charts View */
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>התפתחות לאורך זמן</CardTitle>
                    <CardDescription>
                      גרפים המציגים את השינויים בכל הפרמטרים
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          label={{ value: 'חודש', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: '₪', angle: -90, position: 'insideLeft' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip 
                          formatter={(value) => `₪${value.toLocaleString()}`}
                          labelFormatter={(label) => `חודש ${label}`}
                        />
                        <Legend />
                        <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                        
                        <Area type="monotone" dataKey="נזיל" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="חיסכון" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="נכסים" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="חוב" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                        <Line type="monotone" dataKey="עושר" stroke="#f59e0b" strokeWidth={3} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>ניתוח תזרים</CardTitle>
                    <CardDescription>
                      פירוט התשלומים והריביות לאורך זמן
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(value) => `₪${value.toLocaleString()}`} />
                        <Legend />
                        
                        <Line 
                          type="monotone" 
                          dataKey="כסף אבוד" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Information Footer */}
        <div className="mt-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>הסבר:</strong> המערכת מדמה את הדינמיקה הפיננסית שלך לאורך זמן. 
              <span className="text-green-600 font-semibold"> R+ </span>
              מייצג ריבית חיובית על חיסכון (כסף שעובד בשבילך), 
              <span className="text-red-600 font-semibold"> R- </span>
              מייצג ריבית על חוב (כסף אבוד). 
              המטרה היא למקסם עושר ולמזער כסף אבוד.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}