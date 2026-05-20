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
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { formatNumberInput, parseFormattedNumberInput } from '@/lib/currency';
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
import RealTimeMoneyFlow from '@/components/financial-dynamics/RealTimeMoneyFlow';

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

const MONEY_PARAM_KEYS: (keyof FinancialParams)[] = [
  'liquid0', 'debt0', 'savings0', 'assets0', 'incomeMonthly', 'expenseMonthly',
  'allocToDebt', 'allocToSavings', 'allocToAssets',
];
const RATE_PARAM_KEYS: (keyof FinancialParams)[] = [
  'debtRateAPR', 'savingsRateAPR', 'assetsGrowthAPR',
];

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
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [debtPaymentDay, setDebtPaymentDay] = useState(15);
  const [savingsPaymentDay, setSavingsPaymentDay] = useState(1);
  
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
    const parsed = RATE_PARAM_KEYS.includes(key)
      ? parseFloat(value) || 0
      : MONEY_PARAM_KEYS.includes(key)
        ? parseFormattedNumberInput(value)
        : parseFloat(value) || 0;
    setParams(prev => ({ ...prev, [key]: parsed }));
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

  const handlePaymentDayChange = (type: 'debt' | 'savings', day: number) => {
    if (type === 'debt') {
      setDebtPaymentDay(day);
    } else {
      setSavingsPaymentDay(day);
    }
  };

  // Close settings modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && settingsPanelOpen) {
        setSettingsPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [settingsPanelOpen]);

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
                onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                הגדרות
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Settings Panel - Slide from right */}
        <AnimatePresence>
          {settingsPanelOpen && (
            <>
              {/* Backdrop for outside click */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setSettingsPanelOpen(false)}
              />
              
              {/* Settings Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed right-0 top-16 bottom-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto border-l border-gray-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">הגדרות סימולציה</h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSettingsPanelOpen(false)}
                        className="rounded-full hover:bg-gray-100"
                        title="סגור"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSettingsPanelOpen(false)}
                        className="rounded-full hover:bg-gray-100 text-gray-500"
                        title="סגור"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  </div>
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
                      <FormattedNumberInput
                        id="liquid0"
                        value={params.liquid0 ? formatNumberInput(String(params.liquid0)) : ''}
                        onValueChange={(v) => handleParamChange('liquid0', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="debt0">חוב התחלתי</Label>
                      <FormattedNumberInput
                        id="debt0"
                        value={params.debt0 ? formatNumberInput(String(params.debt0)) : ''}
                        onValueChange={(v) => handleParamChange('debt0', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="savings0">חיסכון התחלתי</Label>
                      <FormattedNumberInput
                        id="savings0"
                        value={params.savings0 ? formatNumberInput(String(params.savings0)) : ''}
                        onValueChange={(v) => handleParamChange('savings0', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="assets0">נכסים התחלתיים</Label>
                      <FormattedNumberInput
                        id="assets0"
                        value={params.assets0 ? formatNumberInput(String(params.assets0)) : ''}
                        onValueChange={(v) => handleParamChange('assets0', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="flow" className="space-y-3">
                    <div>
                      <Label htmlFor="income">הכנסה חודשית</Label>
                      <FormattedNumberInput
                        id="income"
                        value={params.incomeMonthly ? formatNumberInput(String(params.incomeMonthly)) : ''}
                        onValueChange={(v) => handleParamChange('incomeMonthly', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expense">הוצאות חודשיות</Label>
                      <FormattedNumberInput
                        id="expense"
                        value={params.expenseMonthly ? formatNumberInput(String(params.expenseMonthly)) : ''}
                        onValueChange={(v) => handleParamChange('expenseMonthly', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allocDebt">הקצאה לחוב</Label>
                      <FormattedNumberInput
                        id="allocDebt"
                        value={params.allocToDebt ? formatNumberInput(String(params.allocToDebt)) : ''}
                        onValueChange={(v) => handleParamChange('allocToDebt', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allocSavings">הקצאה לחיסכון</Label>
                      <FormattedNumberInput
                        id="allocSavings"
                        value={params.allocToSavings ? formatNumberInput(String(params.allocToSavings)) : ''}
                        onValueChange={(v) => handleParamChange('allocToSavings', v)}
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allocAssets">הקצאה לנכסים</Label>
                      <FormattedNumberInput
                        id="allocAssets"
                        value={params.allocToAssets ? formatNumberInput(String(params.allocToAssets)) : ''}
                        onValueChange={(v) => handleParamChange('allocToAssets', v)}
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
            
            {/* Payment Day Settings */}
            <Card>
              <CardHeader>
                <CardTitle>הגדרות תשלומים</CardTitle>
                <CardDescription>הגדר ימי תשלום חודשיים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="savingsDay">יום הפקדת חיסכון</Label>
                    <Input
                      id="savingsDay"
                      type="number"
                      min="1"
                      max="31"
                      value={savingsPaymentDay}
                      onChange={(e) => setSavingsPaymentDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="text-center font-bold"
                    />
                    <p className="text-xs text-gray-500 mt-1">יום 1-31 בכל חודש</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="debtDay">יום תשלום חוב</Label>
                    <Input
                      id="debtDay"
                      type="number"
                      min="1"
                      max="31"
                      value={debtPaymentDay}
                      onChange={(e) => setDebtPaymentDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="text-center font-bold"
                    />
                    <p className="text-xs text-gray-500 mt-1">יום 1-31 בכל חודש</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">חיסכון: יום {savingsPaymentDay}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">חוב: יום {debtPaymentDay}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* New Real-Time Money Flow Component */}
          <RealTimeMoneyFlow
            currentState={currentState}
            params={params}
            maxValues={{
              liquid: 200000,
              debt: params.debt0,
              savings: 500000,
              assets: 1000000,
              wealth: 2000000
            }}
            isPlaying={isPlaying}
            playSpeed={playSpeed}
            onSettingsClick={() => setSettingsPanelOpen(true)}
            timeline={timeline}
            debtPaymentDay={debtPaymentDay}
            savingsPaymentDay={savingsPaymentDay}
            onPaymentDayChange={handlePaymentDayChange}
          />
          {/* Charts Section - Always Visible */}
          <div className="grid lg:grid-cols-2 gap-6">

            <Card>
              <CardHeader>
                <CardTitle>התפתחות לאורך זמן</CardTitle>
                <CardDescription>
                  גרפים המציגים את השינויים בכל הפרמטרים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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

          {/* Key Metrics Cards */}
          <div className="grid md:grid-cols-3 gap-4">
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">תזרים נטו</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${currentState.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₪{currentState.netCashFlow.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  הכנסה - הוצאות
                </p>
              </CardContent>
            </Card>
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
    </div>
  );
}