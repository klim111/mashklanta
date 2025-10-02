'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InfiniteCalendar } from './InfiniteCalendar';
import { FinancialBar3D } from './FinancialBar3D';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Wallet, 
  PiggyBank, 
  Home, 
  TrendingDown,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Settings,
  X,
  Coins,
  Banknote,
  AlertCircle,
  CreditCard,
  Shield
} from 'lucide-react';

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

interface RealTimeMoneyFlowProps {
  currentState: TimelineState;
  params: {
    incomeMonthly: number;
    expenseMonthly: number;
    debtRateAPR: number;
    savingsRateAPR: number;
    assetsGrowthAPR: number;
  };
  maxValues?: {
    liquid: number;
    debt: number;
    savings: number;
    assets: number;
    wealth: number;
  };
  isPlaying?: boolean;
  playSpeed?: number;
  onSettingsClick?: () => void;
  timeline?: TimelineState[];
  debtPaymentDay?: number;
  savingsPaymentDay?: number;
  onPaymentDayChange?: (type: 'debt' | 'savings', day: number) => void;
}

// Modern Progress Bar Component
const ModernProgressBar: React.FC<{
  value: number;
  maxValue: number;
  label: string;
  icon: React.ElementType;
  color: string;
  sublabel?: string;
  trend?: number;
  isAnimating?: boolean;
  layer?: 'top' | 'middle' | 'bottom' | 'side';
  onClick?: () => void;
  isSelected?: boolean;
  segments?: { value: number; label: string; color: string }[];
  showDividers?: boolean;
}> = ({ value, maxValue, label, icon: Icon, color, sublabel, trend, isAnimating, layer, onClick, isSelected, segments, showDividers }) => {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const layerStyles = {
    top: 'h-20',
    middle: 'h-32',
    bottom: 'h-24',
    side: 'h-16'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      className={`relative ${layerStyles[layer || 'middle']} bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl overflow-hidden border-2 ${isSelected ? 'border-blue-500' : 'border-gray-200'} shadow-sm hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)`
        }} />
      </div>

      {/* Progress Fill with Segments */}
      {segments && segments.length > 0 && showDividers ? (
        <motion.div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${displayPercentage}%` }}
          transition={{ 
            duration: 1.5, 
            ease: [0.4, 0, 0.2, 1],
            delay: 0.2
          }}
        >
          {/* Internal dividers for liquid money segments */}
          {segments.map((segment, index) => {
            if (index === segments.length - 1) return null;
            const position = segments.slice(0, index + 1).reduce((acc, seg) => acc + (seg.value / value) * 100, 0);
            return (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: `${position}%` }}
              />
            );
          })}
          {/* Segment labels */}
          {segments.map((segment, index) => {
            const segmentWidth = (segment.value / value) * 100;
            const previousWidth = segments.slice(0, index).reduce((acc, seg) => acc + (seg.value / value) * 100, 0);
            return (
              <div
                key={`label-${index}`}
                className="absolute top-0 bottom-0 flex items-center justify-center"
                style={{ 
                  left: `${previousWidth}%`,
                  width: `${segmentWidth}%`
                }}
              >
                {segmentWidth > 10 && (
                  <span className="text-xs font-semibold text-white/80 drop-shadow">
                    {segment.label}
                  </span>
                )}
              </div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} shadow-lg`}
          initial={{ width: 0 }}
          animate={{ width: `${displayPercentage}%` }}
          transition={{ 
            duration: 1.5, 
            ease: [0.4, 0, 0.2, 1],
            delay: 0.2
          }}
        >
        {/* Animated Shine Effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
          animate={{
            x: ['-100%', '200%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "linear"
          }}
        />
        
        {/* Pulse Effect when animating */}
        {isAnimating && (
          <motion.div
            className="absolute inset-0 bg-white opacity-20"
            animate={{
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 1,
              repeat: Infinity
            }}
          />
        )}
      </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={`w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${color.includes('red') ? 'text-red-600' : color.includes('green') ? 'text-green-600' : color.includes('blue') ? 'text-blue-600' : color.includes('purple') ? 'text-purple-600' : 'text-amber-600'}`} />
            </div>
            {trend !== undefined && trend !== 0 && (
              <motion.div 
                className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${trend > 0 ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3 text-white" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-white" />
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Label and Value */}
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
            {sublabel && (
              <p className="text-xs text-gray-500">{sublabel}</p>
            )}
          </div>
        </div>

        {/* Value Display */}
        <motion.div 
          className="text-right"
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="text-2xl font-bold text-gray-900">
            ₪{value.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            {percentage.toFixed(1)}%
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Pipe Animation Component
const PipeFlow: React.FC<{
  fromSegment: 'debt' | 'savings' | 'disposable';
  toBar: 'debt' | 'savings' | 'assets';
  isActive: boolean;
  amount: number;
  liquidSegments?: { value: number; label: string; color: string }[];
}> = ({ fromSegment, toBar, isActive, amount, liquidSegments = [] }) => {
  if (!isActive || amount <= 0) return null;

  const pipeColor = toBar === 'debt' ? '#ef4444' : toBar === 'savings' ? '#10b981' : '#8b5cf6';
  
  // Calculate actual positions based on segments in liquid bar
  // Segments order in liquid bar: [savings (right), disposable (middle), debt (left)]
  let fromX = 50; // default middle
  if (liquidSegments.length === 3) {
    const totalValue = liquidSegments.reduce((sum, seg) => sum + seg.value, 0);
    if (totalValue > 0) {
      if (toBar === 'savings') {
        // From right segment border (between savings and disposable)
        const savingsEnd = (liquidSegments[0].value / totalValue) * 100;
        fromX = savingsEnd; // Border between savings and disposable
      } else if (toBar === 'debt') {
        // From left segment border (between disposable and debt)
        const debtStart = ((liquidSegments[0].value + liquidSegments[1].value) / totalValue) * 100;
        fromX = debtStart; // Border between disposable and debt
      }
    }
  }
  
  // Bar positions in the grid (3 columns layout)
  // Savings is first column, Assets middle, Debt last column
  const toX = toBar === 'savings' ? 16.67 : toBar === 'debt' ? 83.33 : 50;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 15 }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`pipe-${fromSegment}-${toBar}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={pipeColor} stopOpacity="0.2" />
            <stop offset="50%" stopColor={pipeColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={pipeColor} stopOpacity="0.2" />
          </linearGradient>
          <filter id={`glow-${fromSegment}-${toBar}`}>
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Connection points indicators - smaller */}
        <motion.circle 
          cx={`${fromX}`} 
          cy="12" 
          r="1.5" 
          fill={pipeColor} 
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <motion.circle 
          cx={`${toX}`} 
          cy="42" 
          r="1.5" 
          fill={pipeColor}
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
        />
        
        {/* Pipe path from liquid bar down to middle bars (savings/debt) */}
        <motion.path
          d={`M ${fromX} 12 
              L ${fromX} 22
              C ${fromX} 30, ${toX} 36, ${toX} 38
              L ${toX} 42`}
          stroke={`url(#pipe-${fromSegment}-${toBar})`}
          strokeWidth="4"
          fill="none"
          filter={`url(#glow-${fromSegment}-${toBar})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          exit={{ pathLength: 0, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Flow animation - animated dashes flowing DOWN */}
        <motion.path
          d={`M ${fromX} 12 
              L ${fromX} 22
              C ${fromX} 30, ${toX} 36, ${toX} 38
              L ${toX} 42`}
          stroke={pipeColor}
          strokeWidth="2"
          fill="none"
          strokeDasharray="5 10"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -15 }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Flow particles - moving DOWN from liquid to bars */}
        {[...Array(5)].map((_, i) => (
          <motion.circle
            key={i}
            r="1.5"
            fill={pipeColor}
            initial={{ 
              opacity: 0,
              x: fromX,
              y: 12
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              x: [fromX, fromX, toX, toX],
              y: [12, 22, 38, 42]
            }}
            transition={{ 
              duration: 1.5,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
        
        {/* Arrow showing flow direction - smaller and at bar entry */}
        <motion.polygon
          points={`${toX-2},39 ${toX+2},39 ${toX},43`}
          fill={pipeColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        
        {/* Flow amount label */}
        <motion.text
          x={`${(fromX + toX) / 2}`}
          y="28"
          fill={pipeColor}
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          ₪{amount.toLocaleString()}
        </motion.text>
      </svg>
    </motion.div>
  );
};

// Sankey-style Flow Animation
const SankeyFlow: React.FC<{
  from: string;
  to: string;
  amount: number;
  isActive: boolean;
  color: string;
}> = ({ from, to, amount, isActive, color }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    if (isActive && amount > 0) {
      controls.start({
        strokeDashoffset: [1000, 0],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }
      });
    }
  }, [isActive, amount, controls]);

  if (!isActive || amount <= 0) return null;

  // Define positions for each container
  const positions: Record<string, { x: number; y: number }> = {
    income: { x: 50, y: 0 },
    liquid: { x: 50, y: 100 },
    debt: { x: 10, y: 250 },
    savings: { x: 35, y: 250 },
    assets: { x: 65, y: 250 },
    lost: { x: 90, y: 250 },
    wealth: { x: 50, y: 400 }
  };

  const fromPos = positions[from];
  const toPos = positions[to];

  if (!fromPos || !toPos) return null;

  // Calculate path with smooth curves
  const midY = (fromPos.y + toPos.y) / 2;
  const controlPoint1 = { x: fromPos.x, y: midY - 20 };
  const controlPoint2 = { x: toPos.x, y: midY + 20 };

  const path = `M ${fromPos.x} ${fromPos.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${toPos.x} ${toPos.y}`;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      <defs>
        <linearGradient id={`flow-gradient-${from}-${to}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.1" />
          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
        <filter id={`glow-${from}-${to}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background path */}
      <path
        d={path}
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.2"
      />
      
      {/* Animated flow */}
      <motion.path
        ref={pathRef}
        d={path}
        stroke={`url(#flow-gradient-${from}-${to})`}
        strokeWidth={Math.max(3, Math.min(15, amount / 2000))}
        fill="none"
        strokeDasharray="20 10"
        animate={controls}
        filter={`url(#glow-${from}-${to})`}
      />
      
      {/* Flow particles */}
      <motion.circle
        r="4"
        fill={color}
        filter={`url(#glow-${from}-${to})`}
        initial={{ 
          x: fromPos.x,
          y: fromPos.y,
          opacity: 0
        }}
        animate={{ 
          x: toPos.x,
          y: toPos.y,
          opacity: [0, 1, 1, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Amount label */}
      <motion.text
        x={(fromPos.x + toPos.x) / 2}
        y={(fromPos.y + toPos.y) / 2 - 10}
        fill={color}
        fontSize="12"
        fontWeight="bold"
        textAnchor="middle"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          times: [0, 0.2, 0.8, 1]
        }}
      >
        ₪{amount.toLocaleString()}
      </motion.text>
    </svg>
  );
};

const RealTimeMoneyFlow: React.FC<RealTimeMoneyFlowProps> = ({
  currentState,
  params,
  maxValues = {
    liquid: 200000,
    debt: 1000000,
    savings: 500000,
    assets: 1000000,
    wealth: 2000000
  },
  isPlaying = false,
  playSpeed = 1,
  onSettingsClick,
  timeline = [],
  debtPaymentDay = 15,
  savingsPaymentDay = 1,
  onPaymentDayChange
}) => {
  const [incomeAnimating, setIncomeAnimating] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('wealth');
  const [liquidSegments, setLiquidSegments] = useState<{ value: number; label: string; color: string }[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showPipes, setShowPipes] = useState({ toSavings: false, toDebt: false, toAssets: false });
  const [simulationDay, setSimulationDay] = useState(0);
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0); // Track which timeline state to show
  const [debtDetailOpen, setDebtDetailOpen] = useState(false); // Track debt detail module state
  const [savingsDetailOpen, setSavingsDetailOpen] = useState(false); // Track savings detail module state
  const [assetsDetailOpen, setAssetsDetailOpen] = useState(false); // Track assets detail module state
  const [costsRowOpen, setCostsRowOpen] = useState(false); // Track costs row visibility
  const [activeCostsType, setActiveCostsType] = useState<'savings' | 'assets' | 'debt' | null>(null); // Track which costs type is active
  
  // Debt breakdown data
  const debtBreakdown = {
    mortgage: {
      total: 400000,
      tracks: [
        { name: "קל״ץ", amount: 200000, rate: 3.2, type: "fixed" },
        { name: "פריים", amount: 100000, rate: 2.8, type: "prime" },
        { name: "משתנה 5 שנים", amount: 100000, rate: 3.5, type: "variable" }
      ]
    },
    loans: {
      total: 100000,
      items: [
        { name: "הלוואת רכב", amount: 50000, rate: 4.5 },
        { name: "הלוואה צרכנית", amount: 30000, rate: 6.2 },
        { name: "כרטיס אשראי", amount: 20000, rate: 18.0 }
      ]
    }
  };

  // Savings breakdown data
  const savingsBreakdown = {
    pension: {
      total: 150000,
      items: [
        { name: "פכ״ם", amount: 80000, rate: 4.2, period: "עד פרישה", type: "pension" },
        { name: "קרן השתלמות", amount: 40000, rate: 3.8, period: "6 שנים", type: "education" },
        { name: "קופת גמל", amount: 30000, rate: 3.5, period: "עד פרישה", type: "pension" }
      ]
    },
    monthlySavings: {
      total: 50000,
      items: [
        { name: "תוכנית חיסכון 3 שנים", amount: 20000, rate: 2.8, period: "3 שנים", type: "monthly" },
        { name: "תוכנית חיסכון 5 שנים", amount: 18000, rate: 3.2, period: "5 שנים", type: "monthly" },
        { name: "פקדון קצר טווח", amount: 12000, rate: 2.1, period: "1 שנה", type: "deposit" }
      ]
    }
  };

  // Assets breakdown data
  const assetsBreakdown = {
    realEstate: {
      total: 800000,
      items: [
        { name: "דירה למגורים", amount: 600000, value: 650000, type: "residential", location: "תל אביב" },
        { name: "דירה להשקעה", amount: 200000, value: 220000, type: "investment", location: "חיפה" }
      ]
    },
    stocks: {
      total: 150000,
      items: [
        { name: "מניות ישראל", amount: 80000, value: 85000, type: "local", sector: "טכנולוגיה" },
        { name: "מניות חו״ל", amount: 70000, value: 72000, type: "international", sector: "פיננסים" }
      ]
    },
    bonds: {
      total: 100000,
      items: [
        { name: "אג״ח ממשלתי", amount: 60000, value: 61000, type: "government", yield: 3.2 },
        { name: "אג״ח קונצרני", amount: 40000, value: 40500, type: "corporate", yield: 4.1 }
      ]
    }
  };
  
  // Calculate which timeline state to display based on current date
  const displayState = timeline.length > 0 ? timeline[Math.min(currentTimelineIndex, timeline.length - 1)] : currentState;

  // Auto-advance timeline when simulation is playing
  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTimelineIndex(prev => {
        const nextIndex = prev + 1;
        // Loop back to start when reaching the end
        return nextIndex >= timeline.length ? 0 : nextIndex;
      });
    }, 1000 / playSpeed); // Use playSpeed to control timing

    return () => clearInterval(interval);
  }, [isPlaying, timeline.length, playSpeed]);



  // Trigger income animation periodically when playing
  useEffect(() => {
    if (isPlaying && displayState.netCashFlow > 0) {
      const timer = setInterval(() => {
        setIncomeAnimating(true);
        setTimeout(() => setIncomeAnimating(false), 2000);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [isPlaying, displayState.netCashFlow]);

  // No savings segments needed - removed the green bars

  // Calculate liquid money segments based on displayState (which changes with navigation)
  useEffect(() => {
    const totalLiquid = displayState.liquid;
    if (totalLiquid > 0) {
      const allocToSavings = Math.min(displayState.savingsDeposit || 5000, totalLiquid);
      const allocToDebt = Math.min(displayState.debtPayment || 3000, totalLiquid - allocToSavings);
      const disposableIncome = Math.max(0, totalLiquid - allocToDebt - allocToSavings);
      
      setLiquidSegments([
        { value: allocToSavings, label: 'לחסכון', color: '' },
        { value: disposableIncome, label: 'הכנסה פנויה', color: '' },
        { value: allocToDebt, label: 'לחוב', color: '' }
      ]);
    }
  }, [displayState]);

  // Handle date change and trigger transfers on payment days
  const handleDateChange = useCallback((newDate: Date) => {
    console.log('🔄 STEP 5: handleDateChange called with:', newDate);
    
    const oldDate = currentDate;
    setCurrentDate(newDate);
    setCurrentDay(newDate.getDate());
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
    
    // Calculate which timeline index to show based on days from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((newDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('🔄 STEP 6: Days difference calculated:', daysDiff);
    
    // Map days to timeline months (roughly 30 days per month)
    const timelineIndex = Math.max(0, Math.floor(daysDiff / 30));
    setCurrentTimelineIndex(timelineIndex);
    
    // Check if we hit a payment day and trigger bar updates
    const day = newDate.getDate();
    
    // Force bar updates on payment days
    if (day === debtPaymentDay || day === savingsPaymentDay) {
      const pipes = {
        toSavings: day === savingsPaymentDay,
        toDebt: day === debtPaymentDay,
        toAssets: false
      };
      setShowPipes(pipes);
      
      // Auto-hide pipes after animation
      setTimeout(() => {
        setShowPipes({ toSavings: false, toDebt: false, toAssets: false });
      }, 3000);
    }
    
  }, [currentDate, debtPaymentDay, savingsPaymentDay, timeline]);

  // Handle day progression and automatic transfers
  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setSimulationDay(prev => prev + 1);
        setCurrentDate(prevDate => {
          const newDate = new Date(prevDate);
          newDate.setDate(newDate.getDate() + 1);
          
          // Check if we hit payment days and trigger bar updates
          const day = newDate.getDate();
          if (day === debtPaymentDay) {
            setShowPipes(prev => ({ ...prev, toDebt: true }));
            setTimeout(() => {
              setShowPipes(prev => ({ ...prev, toDebt: false }));
            }, 2000);
          }
          if (day === savingsPaymentDay) {
            setShowPipes(prev => ({ ...prev, toSavings: true }));
            setTimeout(() => {
              setShowPipes(prev => ({ ...prev, toSavings: false }));
            }, 2000);
          }
          
          setCurrentDay(newDate.getDate());
          setCurrentMonth(newDate.getMonth());
          setCurrentYear(newDate.getFullYear());
          
          
          return newDate;
        });
      }, 100); // Speed up for demo
      return () => clearInterval(timer);
    }
  }, [isPlaying, debtPaymentDay, savingsPaymentDay]);

  // Prepare chart data based on selected metric
  const chartData = timeline.slice(0, Math.max(currentState.month + 1, 12)).map(state => {
    const dataPoint: any = { month: state.month };
    
    switch (selectedMetric) {
      case 'liquid':
        dataPoint.value = state.liquid;
        break;
      case 'debt':
        dataPoint.value = state.debt;
        break;
      case 'savings':
        dataPoint.value = state.savings;
        break;
      case 'assets':
        dataPoint.value = state.assets;
        break;
      case 'lost':
        dataPoint.value = state.lost;
        break;
      case 'wealth':
      default:
        dataPoint.value = state.wealth;
        break;
    }
    
    return dataPoint;
  });

  const getChartColor = () => {
    const colors: Record<string, string> = {
      liquid: '#3b82f6',
      debt: '#ef4444',
      savings: '#10b981',
      assets: '#8b5cf6',
      lost: '#f97316',
      wealth: '#f59e0b'
    };
    return colors[selectedMetric] || '#6b7280';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get day of year (1-365)
  const getDayOfYear = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };



  return (
    <div className="relative w-full space-y-6">

      {/* Main Container */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              זרימת כסף בזמן אמת
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isPlaying ? "default" : "secondary"} className="animate-pulse">
                {isPlaying ? "פעיל" : "מושהה"}
              </Badge>
              {onSettingsClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSettingsClick}
                  className="rounded-full bg-blue-100 hover:bg-blue-200"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative pt-6">
          {/* Enhanced Income Entry Animation */}
          <AnimatePresence>
            {incomeAnimating && (
              <>
                <motion.div
                  initial={{ x: -200, y: -50, opacity: 0, scale: 0.5, rotate: -180 }}
                  animate={{ 
                    x: ['0%', '45%', '50%'],
                    y: [-50, 20, 60],
                    opacity: [0, 1, 1, 0],
                    scale: [0.5, 1.2, 1, 0.8],
                    rotate: [180, 360, 380]
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ 
                    duration: 2.5, 
                    ease: "easeInOut",
                    times: [0, 0.4, 0.8, 1]
                  }}
                  className="absolute top-0 left-0 z-30"
                >
                  <motion.div 
                    className="relative"
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(34, 197, 94, 0.5)',
                        '0 0 40px rgba(34, 197, 94, 0.8)',
                        '0 0 20px rgba(34, 197, 94, 0.5)'
                      ]
                    }}
                    transition={{ duration: 1, repeat: 2 }}
                  >
                    <div className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-green-600 text-white px-6 py-3 rounded-full shadow-2xl">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, ease: "linear" }}
                      >
                        <Banknote className="w-6 h-6" />
                      </motion.div>
                      <span className="font-bold text-lg">+₪{params.incomeMonthly.toLocaleString()}</span>
                    </div>
                  </motion.div>
                </motion.div>
                
                {/* Particle Effects */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: '45%', 
                      y: 50, 
                      opacity: 0,
                      scale: 0
                    }}
                    animate={{ 
                      x: `${45 + (Math.random() - 0.5) * 20}%`,
                      y: 50 + (Math.random() - 0.5) * 30,
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 1,
                      delay: 1.5 + i * 0.1,
                      ease: "easeOut"
                    }}
                    className="absolute top-0 left-0 z-25"
                  >
                    <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          <div className="space-y-6 relative">
            {/* Layer 1: Liquid Money */}
            <FinancialBar3D depth={0} isActive={selectedMetric === 'liquid'}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ModernProgressBar
                  value={displayState.liquid}
                  maxValue={maxValues.liquid}
                  label="כסף נזיל"
                  sublabel="זמין מיידית"
                  icon={Wallet}
                  color="from-blue-400 to-blue-600"
                  isAnimating={incomeAnimating}
                  layer="top"
                  onClick={() => setSelectedMetric('liquid')}
                  isSelected={selectedMetric === 'liquid'}
                  segments={liquidSegments}
                  showDividers={true}
                />
              </motion.div>
            </FinancialBar3D>

            {/* Layer 2: Savings, Assets, Debt - Single 3D Container */}
            <FinancialBar3D depth={1} isActive={selectedMetric === 'savings' || selectedMetric === 'assets' || selectedMetric === 'debt' || selectedMetric === 'lost'}>
              <div className="space-y-3">
                {/* Top row: Conditional layout based on detail state */}
                {debtDetailOpen ? (
                  /* Debt bar centered when detail is open */
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="relative w-1/3"
                    >
                      <div className="relative">
                        <ModernProgressBar
                          value={displayState.debt}
                          maxValue={maxValues.debt}
                          label="חוב"
                          sublabel={`ריבית ${params.debtRateAPR}%`}
                          icon={TrendingDown}
                          color="from-red-400 to-red-600"
                          trend={-params.debtRateAPR}
                          isAnimating={displayState.debtPayment > 0}
                          layer="middle"
                          onClick={() => setSelectedMetric('debt')}
                          isSelected={selectedMetric === 'debt'}
                        />
                        
                        {/* Close button inside bar at bottom center */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDebtDetailOpen(false);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-white/90 border border-gray-300 rounded-full hover:bg-white shadow-sm transition-all duration-200 text-xs"
                            title="סגור פירוט"
                          >
                            <span className="text-gray-600">סגור</span>
                            <motion.div
                              animate={{ rotate: 180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </motion.div>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ) : savingsDetailOpen ? (
                  /* Savings bar centered when detail is open */
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="relative w-1/3"
                    >
                      <div className="relative">
                        <ModernProgressBar
                          value={displayState.savings}
                          maxValue={maxValues.savings}
                          label="חסכונות"
                          sublabel={`R+ ${params.savingsRateAPR}%`}
                          icon={Shield}
                          color="from-green-400 to-green-600"
                          trend={params.savingsRateAPR}
                          isAnimating={displayState.savingsDeposit > 0}
                          layer="middle"
                          onClick={() => setSelectedMetric('savings')}
                          isSelected={selectedMetric === 'savings'}
                        />
                        
                        {/* Close button inside bar at bottom center */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSavingsDetailOpen(false);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-white/90 border border-gray-300 rounded-full hover:bg-white shadow-sm transition-all duration-200 text-xs"
                            title="סגור פירוט"
                          >
                            <span className="text-gray-600">סגור</span>
                            <motion.div
                              animate={{ rotate: 180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </motion.div>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ) : assetsDetailOpen ? (
                  /* Assets bar centered when detail is open */
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="relative w-1/3"
                    >
                      <div className="relative">
                        <ModernProgressBar
                          value={displayState.assets}
                          maxValue={maxValues.assets}
                          label="נכסים"
                          sublabel={`צמיחה ${params.assetsGrowthAPR}%`}
                          icon={Home}
                          color="from-purple-400 to-purple-600"
                          trend={params.assetsGrowthAPR}
                          isAnimating={displayState.assetsInvestment > 0}
                          layer="middle"
                          onClick={() => setSelectedMetric('assets')}
                          isSelected={selectedMetric === 'assets'}
                        />
                        
                        {/* Close button inside bar at bottom center */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssetsDetailOpen(false);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-white/90 border border-gray-300 rounded-full hover:bg-white shadow-sm transition-all duration-200 text-xs"
                            title="סגור פירוט"
                          >
                            <span className="text-gray-600">סגור</span>
                            <motion.div
                              animate={{ rotate: 180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </motion.div>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  /* Normal 3-column layout when detail is closed */
                  <div className="grid grid-cols-3 gap-3 items-center">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative"
                  >
                    <div className="relative">
                      <ModernProgressBar
                        value={displayState.savings}
                        maxValue={maxValues.savings}
                        label="חסכונות"
                        sublabel={`R+ ${params.savingsRateAPR}%`}
                        icon={Shield}
                        color="from-green-400 to-green-600"
                        trend={params.savingsRateAPR}
                        isAnimating={displayState.savingsDeposit > 0}
                        layer="middle"
                        onClick={() => setSelectedMetric('savings')}
                        isSelected={selectedMetric === 'savings'}
                      />
                      
                      {/* Buttons inside bar at bottom center */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSavingsDetailOpen(!savingsDetailOpen);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-white/90 border border-gray-300 rounded-full hover:bg-white shadow-sm transition-all duration-200 text-xs"
                          title={savingsDetailOpen ? "סגור פירוט" : "פתח פירוט"}
                        >
                          <span className="text-gray-600">פירוט</span>
                          <motion.div
                            animate={{ rotate: savingsDetailOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </motion.div>
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCostsRowOpen(!costsRowOpen || activeCostsType !== 'savings');
                            setActiveCostsType(costsRowOpen && activeCostsType === 'savings' ? null : 'savings');
                          }}
                          className={`flex items-center gap-1 px-2 py-1 border rounded-full shadow-sm transition-all duration-200 text-xs ${
                            costsRowOpen && activeCostsType === 'savings' 
                              ? 'bg-green-100 border-green-300 text-green-700' 
                              : 'bg-white/90 border-gray-300 text-gray-600 hover:bg-white'
                          }`}
                          title={costsRowOpen && activeCostsType === 'savings' ? "סגור עלויות" : "פתח עלויות"}
                        >
                          <span>עלויות</span>
                          <motion.div
                            animate={{ rotate: costsRowOpen && activeCostsType === 'savings' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </motion.div>
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative"
                  >
                    <div className="relative">
                      <ModernProgressBar
                        value={displayState.assets}
                        maxValue={maxValues.assets}
                        label="נכסים"
                        sublabel={`צמיחה ${params.assetsGrowthAPR}%`}
                        icon={Home}
                        color="from-purple-400 to-purple-600"
                        trend={params.assetsGrowthAPR}
                        isAnimating={displayState.assetsInvestment > 0}
                        layer="middle"
                        onClick={() => setSelectedMetric('assets')}
                        isSelected={selectedMetric === 'assets'}
                      />
                      
                      {/* Buttons inside bar at bottom center */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssetsDetailOpen(!assetsDetailOpen);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-white/90 border border-gray-300 rounded-full hover:bg-white shadow-sm transition-all duration-200 text-xs"
                          title={assetsDetailOpen ? "סגור פירוט" : "פתח פירוט"}
                        >
                          <span className="text-gray-600">פירוט</span>
                          <motion.div
                            animate={{ rotate: assetsDetailOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </motion.div>
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCostsRowOpen(!costsRowOpen || activeCostsType !== 'assets');
                            setActiveCostsType(costsRowOpen && activeCostsType === 'assets' ? null : 'assets');
                          }}
                          className={`flex items-center gap-1 px-2 py-1 border rounded-full shadow-sm transition-all duration-200 text-xs ${
                            costsRowOpen && activeCostsType === 'assets' 
                              ? 'bg-purple-100 border-purple-300 text-purple-700' 
                              : 'bg-white/90 border-gray-300 text-gray-600 hover:bg-white'
                          }`}
                          title={costsRowOpen && activeCostsType === 'assets' ? "סגור עלויות" : "פתח עלויות"}
                        >
                          <span>עלויות</span>
                          <motion.div
                            animate={{ rotate: costsRowOpen && activeCostsType === 'assets' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </motion.div>
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative"
                  >
                    <div className="relative">
                      <ModernProgressBar
                        value={displayState.debt}
                        maxValue={maxValues.debt}
                        label="חוב"
                        sublabel={`ריבית ${params.debtRateAPR}%`}
                        icon={TrendingDown}
                        color="from-red-400 to-red-600"
                        trend={-params.debtRateAPR}
                        isAnimating={displayState.debtPayment > 0}
                        layer="middle"
                        onClick={() => setSelectedMetric('debt')}
                        isSelected={selectedMetric === 'debt'}
                      />
                      
                      {/* Buttons inside bar at bottom center */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDebtDetailOpen(!debtDetailOpen);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-white/90 border border-gray-300 rounded-full hover:bg-white shadow-sm transition-all duration-200 text-xs"
                          title={debtDetailOpen ? "סגור פירוט" : "פתח פירוט"}
                        >
                          <span className="text-gray-600">פירוט</span>
                          <motion.div
                            animate={{ rotate: debtDetailOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </motion.div>
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCostsRowOpen(!costsRowOpen || activeCostsType !== 'debt');
                            setActiveCostsType(costsRowOpen && activeCostsType === 'debt' ? null : 'debt');
                          }}
                          className={`flex items-center gap-1 px-2 py-1 border rounded-full shadow-sm transition-all duration-200 text-xs ${
                            costsRowOpen && activeCostsType === 'debt' 
                              ? 'bg-red-100 border-red-300 text-red-700' 
                              : 'bg-white/90 border-gray-300 text-gray-600 hover:bg-white'
                          }`}
                          title={costsRowOpen && activeCostsType === 'debt' ? "סגור עלויות" : "פתח עלויות"}
                        >
                          <span>עלויות</span>
                          <motion.div
                            animate={{ rotate: costsRowOpen && activeCostsType === 'debt' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </motion.div>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                  </div>
                )}

                {/* Costs Row - Second row that opens when costs button is clicked */}
                <AnimatePresence>
                  {costsRowOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3">
                        {activeCostsType === 'savings' && (
                          <div className="flex justify-center">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="w-1/3"
                            >
                              <ModernProgressBar
                                value={displayState.savings * 0.15} // 15% of savings as interest
                                maxValue={maxValues.savings * 0.2}
                                label="ריבית חסכונות"
                                sublabel="R+ (צבירה)"
                                icon={TrendingUp}
                                color="from-emerald-400 to-emerald-600"
                                isAnimating={displayState.savingsDeposit > 0}
                                layer="side"
                                onClick={() => setSelectedMetric('savingsInterest')}
                                isSelected={selectedMetric === 'savingsInterest'}
                              />
                            </motion.div>
                          </div>
                        )}

                        {activeCostsType === 'assets' && (
                          <div className="flex justify-center">
                            <div className="w-1/3 flex gap-2">
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex-1"
                              >
                                <ModernProgressBar
                                  value={displayState.assets * 0.12} // 12% potential return
                                  maxValue={maxValues.assets * 0.15}
                                  label="תשואה פוטנציאלית"
                                  sublabel="ממכירת נכס"
                                  icon={TrendingUp}
                                  color="from-indigo-400 to-indigo-600"
                                  isAnimating={displayState.assetsInvestment > 0}
                                  layer="side"
                                  onClick={() => setSelectedMetric('assetReturn')}
                                  isSelected={selectedMetric === 'assetReturn'}
                                />
                              </motion.div>
                              
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex-1"
                              >
                                <ModernProgressBar
                                  value={displayState.assets * 0.08} // 8% dividend yield
                                  maxValue={maxValues.assets * 0.1}
                                  label="דיבידנד נכס"
                                  sublabel="תשואה מהנכס"
                                  icon={DollarSign}
                                  color="from-cyan-400 to-cyan-600"
                                  isAnimating={displayState.assetsInvestment > 0}
                                  layer="side"
                                  onClick={() => setSelectedMetric('assetDividend')}
                                  isSelected={selectedMetric === 'assetDividend'}
                                />
                              </motion.div>
                            </div>
                          </div>
                        )}

                        {activeCostsType === 'debt' && (
                          <div className="flex justify-center">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="w-1/3"
                            >
                              <ModernProgressBar
                                value={displayState.lost}
                                maxValue={maxValues.debt / 2}
                                label="כסף אבוד"
                                sublabel="R- (ריבית)"
                                icon={AlertCircle}
                                color="from-orange-400 to-orange-600"
                                isAnimating={displayState.debtInterest > 0}
                                layer="side"
                                onClick={() => setSelectedMetric('lost')}
                                isSelected={selectedMetric === 'lost'}
                              />
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Detail Modules - Expandable (replaces Lost Money when open) */}
                <AnimatePresence mode="wait">
                  {debtDetailOpen ? (
                    <motion.div
                      key="debt-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-4">
                          {/* Mortgage Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Home className="w-4 h-4" />
                              משכנתא - ₪{debtBreakdown.mortgage.total.toLocaleString()}
                            </h4>
                            <div className="space-y-2">
                              {debtBreakdown.mortgage.tracks.map((track, index) => (
                                <motion.div
                                  key={track.name}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.15 }}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      track.type === 'fixed' ? 'bg-blue-500' :
                                      track.type === 'prime' ? 'bg-green-500' : 'bg-purple-500'
                                    }`} />
                                    <div>
                                      <div className="font-medium text-gray-800">{track.name}</div>
                                      <div className="text-xs text-gray-500">
                                        {track.type === 'fixed' ? 'ריבית קבועה' :
                                         track.type === 'prime' ? 'ריבית פריים' : 'ריבית משתנה'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-800">₪{track.amount.toLocaleString()}</div>
                                    <div className="text-sm text-gray-600">{track.rate}%</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Loans Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              הלוואות - ₪{debtBreakdown.loans.total.toLocaleString()}
                            </h4>
                            <div className="space-y-2">
                              {debtBreakdown.loans.items.map((loan, index) => (
                                <motion.div
                                  key={loan.name}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: (index + 3) * 0.05, duration: 0.15 }}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <div>
                                      <div className="font-medium text-gray-800">{loan.name}</div>
                                      <div className="text-xs text-gray-500">הלוואה</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-800">₪{loan.amount.toLocaleString()}</div>
                                    <div className="text-sm text-gray-600">{loan.rate}%</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Total Summary */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.15 }}
                            className="p-3 bg-red-50 rounded-lg border border-red-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-red-800">סה״כ חוב</div>
                              <div className="font-bold text-red-800 text-lg">
                                ₪{(debtBreakdown.mortgage.total + debtBreakdown.loans.total).toLocaleString()}
                              </div>
                            </div>
                          </motion.div>

                          {/* Lost Money Bar */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.15 }}
                          >
                            <ModernProgressBar
                              value={displayState.lost}
                              maxValue={maxValues.debt / 2}
                              label="כסף אבוד"
                              sublabel="R- (ריבית)"
                              icon={AlertCircle}
                              color="from-orange-400 to-orange-600"
                              isAnimating={displayState.debtInterest > 0}
                              layer="side"
                              onClick={() => setSelectedMetric('lost')}
                              isSelected={selectedMetric === 'lost'}
                            />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ) : savingsDetailOpen ? (
                    <motion.div
                      key="savings-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-4">
                          {/* Pension Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <PiggyBank className="w-4 h-4" />
                              פנסיה וחסכונות ארוכי טווח - ₪{savingsBreakdown.pension.total.toLocaleString()}
                            </h4>
                            <div className="space-y-2">
                              {savingsBreakdown.pension.items.map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.15 }}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      item.type === 'pension' ? 'bg-blue-500' :
                                      item.type === 'education' ? 'bg-green-500' : 'bg-purple-500'
                                    }`} />
                                    <div>
                                      <div className="font-medium text-gray-800">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.period}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-800">₪{item.amount.toLocaleString()}</div>
                                    <div className="text-sm text-gray-600">{item.rate}%</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Monthly Savings Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Banknote className="w-4 h-4" />
                              חסכונות חודשיים - ₪{savingsBreakdown.monthlySavings.total.toLocaleString()}
                            </h4>
                            <div className="space-y-2">
                              {savingsBreakdown.monthlySavings.items.map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: (index + 3) * 0.05, duration: 0.15 }}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      item.type === 'monthly' ? 'bg-green-500' :
                                      item.type === 'deposit' ? 'bg-orange-500' : 'bg-blue-500'
                                    }`} />
                                    <div>
                                      <div className="font-medium text-gray-800">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.period}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-800">₪{item.amount.toLocaleString()}</div>
                                    <div className="text-sm text-gray-600">{item.rate}%</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Total Summary */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.15 }}
                            className="p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-green-800">סה״כ חסכונות</div>
                              <div className="font-bold text-green-800 text-lg">
                                ₪{(savingsBreakdown.pension.total + savingsBreakdown.monthlySavings.total).toLocaleString()}
                              </div>
                            </div>
                          </motion.div>

                          {/* Savings Interest Bar */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.15 }}
                          >
                            <ModernProgressBar
                              value={displayState.savings * 0.15} // 15% of savings as interest
                              maxValue={maxValues.savings * 0.2}
                              label="ריבית חסכונות"
                              sublabel="R+ (צבירה)"
                              icon={TrendingUp}
                              color="from-emerald-400 to-emerald-600"
                              isAnimating={displayState.savingsDeposit > 0}
                              layer="side"
                              onClick={() => setSelectedMetric('savingsInterest')}
                              isSelected={selectedMetric === 'savingsInterest'}
                            />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ) : assetsDetailOpen ? (
                    <motion.div
                      key="assets-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-4">
                          {/* Real Estate Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Home className="w-4 h-4" />
                              נדלן - ₪{assetsBreakdown.realEstate.total.toLocaleString()}
                            </h4>
                            <div className="space-y-2">
                              {assetsBreakdown.realEstate.items.map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.15 }}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      item.type === 'residential' ? 'bg-blue-500' : 'bg-green-500'
                                    }`} />
                                    <div>
                                      <div className="font-medium text-gray-800">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.location}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-800">₪{item.value.toLocaleString()}</div>
                                    <div className="text-sm text-green-600">+₪{(item.value - item.amount).toLocaleString()}</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Stocks Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              מניות - ₪{assetsBreakdown.stocks.total.toLocaleString()}
                            </h4>
                            <div className="space-y-2">
                              {assetsBreakdown.stocks.items.map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: (index + 2) * 0.05, duration: 0.15 }}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      item.type === 'local' ? 'bg-blue-500' : 'bg-purple-500'
                                    }`} />
                                    <div>
                                      <div className="font-medium text-gray-800">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.sector}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-800">₪{item.value.toLocaleString()}</div>
                                    <div className="text-sm text-green-600">+₪{(item.value - item.amount).toLocaleString()}</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Bonds Section */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              אג״ח - ₪{assetsBreakdown.bonds.total.toLocaleString()}
                            </h4>
                            <div className="space-y-2">
                              {assetsBreakdown.bonds.items.map((item, index) => (
                                <motion.div
                                  key={item.name}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: (index + 4) * 0.05, duration: 0.15 }}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      item.type === 'government' ? 'bg-green-500' : 'bg-orange-500'
                                    }`} />
                                    <div>
                                      <div className="font-medium text-gray-800">{item.name}</div>
                                      <div className="text-xs text-gray-500">{item.yield}% תשואה</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-800">₪{item.value.toLocaleString()}</div>
                                    <div className="text-sm text-green-600">+₪{(item.value - item.amount).toLocaleString()}</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Total Summary */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.15 }}
                            className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-purple-800">סה״כ נכסים</div>
                              <div className="font-bold text-purple-800 text-lg">
                                ₪{(assetsBreakdown.realEstate.total + assetsBreakdown.stocks.total + assetsBreakdown.bonds.total).toLocaleString()}
                              </div>
                            </div>
                          </motion.div>

                          {/* Asset Return Bars */}
                          <div className="grid grid-cols-2 gap-3">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4, duration: 0.15 }}
                            >
                              <ModernProgressBar
                                value={displayState.assets * 0.12} // 12% potential return
                                maxValue={maxValues.assets * 0.15}
                                label="תשואה פוטנציאלית"
                                sublabel="ממכירת נכס"
                                icon={TrendingUp}
                                color="from-indigo-400 to-indigo-600"
                                isAnimating={displayState.assetsInvestment > 0}
                                layer="side"
                                onClick={() => setSelectedMetric('assetReturn')}
                                isSelected={selectedMetric === 'assetReturn'}
                              />
                            </motion.div>
                            
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5, duration: 0.15 }}
                            >
                              <ModernProgressBar
                                value={displayState.assets * 0.08} // 8% dividend yield
                                maxValue={maxValues.assets * 0.1}
                                label="דיבידנד נכס"
                                sublabel="תשואה מהנכס"
                                icon={DollarSign}
                                color="from-cyan-400 to-cyan-600"
                                isAnimating={displayState.assetsInvestment > 0}
                                layer="side"
                                onClick={() => setSelectedMetric('assetDividend')}
                                isSelected={selectedMetric === 'assetDividend'}
                              />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </FinancialBar3D>

            {/* Layer 3: Wealth */}
            <FinancialBar3D depth={2} isActive={selectedMetric === 'wealth'}>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <ModernProgressBar
                  value={Math.max(0, displayState.wealth)}
                  maxValue={maxValues.wealth}
                  label="הון (עושר)"
                  sublabel="נכסים + חסכונות - חובות"
                  icon={Coins}
                  color="from-amber-400 to-amber-600"
                  layer="bottom"
                  onClick={() => setSelectedMetric('wealth')}
                  isSelected={selectedMetric === 'wealth'}
                />
              </motion.div>
            </FinancialBar3D>


            {/* Pipe Flow Animations - from liquid bar to target bars */}
            <AnimatePresence>
              {showPipes.toSavings && (
                <PipeFlow
                  fromSegment="savings"  // This determines which border to use
                  toBar="savings"        // Target bar
                  isActive={true}
                  amount={displayState.savingsDeposit}
                  liquidSegments={liquidSegments}
                />
              )}
              {showPipes.toDebt && (
                <PipeFlow
                  fromSegment="debt"     // This determines which border to use
                  toBar="debt"          // Target bar
                  isActive={true}
                  amount={displayState.debtPayment}
                  liquidSegments={liquidSegments}
                />
              )}
            </AnimatePresence>
            
            {/* Timeline and Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">לוח שנה - ציר זמן</h3>
                <span className="text-sm font-medium text-gray-600 min-w-[200px] text-center bg-gray-50 rounded px-2 py-1">
                  {formatDate(currentDate)}
                </span>
              </div>
              
               {/* Infinite Calendar Timeline View */}
               <InfiniteCalendar
                 currentDate={currentDate}
                 onDateChange={handleDateChange}
                 debtPaymentDay={debtPaymentDay}
                 savingsPaymentDay={savingsPaymentDay}
               />
              
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <div>
                  <span>היום: {new Date().toLocaleDateString('he-IL')}</span>
                  <span className="mx-2">|</span>
                  <span className="font-semibold">נבחר: {currentDate.toLocaleDateString('he-IL')}</span>
                  <span className="mx-2">|</span>
                  <span className="text-blue-600 font-bold">חודש: {currentTimelineIndex}</span>
                  {(currentDate.getDate() === debtPaymentDay || currentDate.getDate() === savingsPaymentDay) && (
                    <span className="mx-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                      יום תשלום!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${currentDate.getDate() === savingsPaymentDay ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`} />
                    <span>חיסכון: {savingsPaymentDay} בחודש</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${currentDate.getDate() === debtPaymentDay ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`} />
                    <span>חוב: {debtPaymentDay} בחודש</span>
                  </div>
                </div>
              </div>
              
              {/* Debug Info */}
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>נזיל: ₪{displayState.liquid.toLocaleString()}</div>
                  <div>חוב: ₪{displayState.debt.toLocaleString()}</div>
                  <div>חיסכון: ₪{displayState.savings.toLocaleString()}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Dynamic Chart Based on Selection */}
          <motion.div 
            className="mt-6 p-4 bg-gray-50 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
                דינמיקת {selectedMetric === 'liquid' ? 'כסף נזיל' : 
                         selectedMetric === 'debt' ? 'חוב' :
                         selectedMetric === 'savings' ? 'חסכונות' :
                         selectedMetric === 'assets' ? 'נכסים' :
                         selectedMetric === 'lost' ? 'כסף אבוד' : 'עושר'}
              </h3>
            </div>
            {timeline.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                    label={{ value: 'חודש', position: 'insideBottom', offset: -5, fontSize: 10 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: any) => `₪${value.toLocaleString()}`}
                    labelFormatter={(label) => `חודש ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={getChartColor()}
                    fill={getChartColor()}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Summary Stats */}
          <motion.div 
            className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="text-center">
              <p className="text-sm text-gray-500">תזרים נטו</p>
              <p className={`text-xl font-bold ${displayState.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₪{displayState.netCashFlow.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">סה"כ הקצאות</p>
              <p className="text-xl font-bold text-blue-600">
                ₪{(displayState.debtPayment + displayState.savingsDeposit + displayState.assetsInvestment).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">רווח מריבית</p>
              <p className="text-xl font-bold text-purple-600">
                ₪{(displayState.savingsInterest + displayState.assetsGrowth).toLocaleString()}
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeMoneyFlow;
