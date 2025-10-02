"use client";

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Calculator, 
  FileText, 
  TrendingUp, 
  Home as HomeIcon,
  Calendar,
  Banknote,
  Edit3,
  Save,
  Copy,
  Trash2,
  Filter,
  Download,
  PieChart,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  ArrowRight,
  ArrowLeft,
  Settings,
  Target,
  Truck,
  ChevronDown,
  ChevronRight,
  Building2,
  Scale,
  Search,
  Package,
  Hammer
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

// Types
interface ExpenseItem {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  paymentDate: string;
  status: 'paid' | 'planned' | 'pending';
  calculationSource: 'percentage' | 'fixed' | 'range';
  percentageOfPrice?: number;
  minAmount?: number;
  maxAmount?: number;
  notes: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  presets: ExpensePreset[];
}

interface ExpensePreset {
  description: string;
  defaultAmount?: number;
  percentageOfPrice?: number;
  minAmount?: number;
  maxAmount?: number;
  notes: string;
}

interface PropertyData {
  price: number;
  targetDate: string;
  financingProfile: 'first-home' | 'replacement' | 'investment' | 'any-purpose';
}

interface EquityPlanningData {
  propertyData: PropertyData;
  expenses: ExpenseItem[];
  currentStep: number;
}

// Categories with presets - organized by process stages
const CATEGORIES: Category[] = [
  {
    id: 'equity',
    name: 'הון עצמי לרכישת הדירה',
    icon: Banknote,
    description: 'הון עצמי מינימלי הנדרש על פי תקנות בנק ישראל',
    color: 'emerald',
    presets: []  // Special category - calculated separately
  },
  {
    id: 'mortgage',
    name: 'עלות לקיחת משכנתא',
    icon: Building2,
    description: 'פתיחת תיק, נוטריון, שמאות',
    color: 'blue',
    presets: [
      {
        description: 'פתיחת תיק משכנתא',
        percentageOfPrice: 0.0025,
        notes: 'בדרך כלל 0.25% ממחיר הנכס'
      },
      {
        description: 'אישור חתימות נוטריון',
        defaultAmount: 500,
        notes: 'אישור חתימות אצל נוטריון'
      },
      {
        description: 'שמאות',
        minAmount: 2000,
        maxAmount: 3500,
        notes: 'בין 2,000-3,500 ₪ בהתאם לערך הנכס'
      }
    ]
  },
  {
    id: 'legal',
    name: 'משפטי',
    icon: Scale,
    description: 'שכר טרחת עורך דין',
    color: 'green',
    presets: [
      {
        description: 'שכר טרחה עורך דין',
        defaultAmount: 8000,
        notes: 'בדרך כלל 6,000-12,000 ₪'
      }
    ]
  },
  {
    id: 'property-search',
    name: 'מציאת נכס',
    icon: Search,
    description: 'תיווך, נסיעות, ימי עבודה',
    color: 'purple',
    presets: [
      {
        description: 'עמלת תיווך',
        percentageOfPrice: 0.02,
        notes: '2% ממחיר הנכס + מע"ם'
      },
      {
        description: 'נסיעות ומעקבים',
        defaultAmount: 1500,
        notes: 'הוצאות נסיעה וביקורים בנכסים'
      },
      {
        description: 'אובדן ימי עבודה',
        defaultAmount: 5000,
        notes: 'ערך של ימי עבודה שהוקדשו לחיפוש'
      }
    ]
  },
  {
    id: 'taxation',
    name: 'מיסוי',
    icon: Banknote,
    description: 'מס רכישה, מס שבח, היטל השבחה',
    color: 'red',
    presets: [
      {
        description: 'מס רכישה',
        percentageOfPrice: 0.035,
        notes: 'תלוי בסוג הנכס - 3.5% לדירה ראשונה'
      },
      {
        description: 'מס שבח',
        defaultAmount: 0,
        notes: 'רק אם לא זכאי לפטור'
      },
      {
        description: 'היטל השבחה',
        defaultAmount: 0,
        notes: 'תלוי ברשות המקומית'
      }
    ]
  },
  {
    id: 'logistics',
    name: 'לוגיסטיקה',
    icon: Package,
    description: 'אחסון, מגורים זמניים, הובלה',
    color: 'amber',
    presets: [
      {
        description: 'אחסון זמני',
        defaultAmount: 2000,
        notes: 'אם יש צורך באחסון'
      },
      {
        description: 'מגורים זמניים',
        defaultAmount: 8000,
        notes: 'דמי שכירות זמניים בין מכירה לרכישה'
      },
      {
        description: 'חברת הובלה',
        defaultAmount: 3000,
        notes: 'תלוי בכמות החפצים ובמרחק'
      }
    ]
  },
  {
    id: 'new-home',
    name: 'בדירה החדשה',
    icon: Hammer,
    description: 'שיפוצים, מכשירי חשמל, ריהוט',
    color: 'orange',
    presets: [
      {
        description: 'שיפוצים',
        minAmount: 50000,
        maxAmount: 150000,
        notes: 'תלוי במצב הנכס'
      },
      {
        description: 'מכשירי חשמל',
        defaultAmount: 25000,
        notes: 'מקרר, מכונת כביסה, מדיח וכו\''
      },
      {
        description: 'ריהוט',
        defaultAmount: 40000,
        notes: 'מיטות, ארונות, שולחן וכו\''
      }
    ]
  },
  {
    id: 'emergency',
    name: 'חירום ובלתי צפוי',
    icon: AlertCircle,
    description: 'הוצאות נוספות שלא נכללו בקטגוריות',
    color: 'gray',
    presets: []  // No sub-items by default
  }
];

const FINANCING_PROFILES = {
  'first-home': { name: 'דירה ראשונה', minEquityPercent: 0.25 },
  'replacement': { name: 'דירה חליפית', minEquityPercent: 0.30 },
  'investment': { name: 'דירה להשקעה', minEquityPercent: 0.50 },
  'any-purpose': { name: 'לכל מטרה', minEquityPercent: 0.50 }
};

export default function EquityPlanningTool() {
  const [data, setData] = useState<EquityPlanningData>({
    propertyData: {
      price: 0,
      targetDate: '',
      financingProfile: 'first-home'
    },
    expenses: [],
    currentStep: 0
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'best' | 'worst' | 'expected'>('expected');
  const [presetsInitialized, setPresetsInitialized] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isEditingEquity, setIsEditingEquity] = useState(false);
  const [isEditingEquityDate, setIsEditingEquityDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null);

  // Initialize calendar to first expense date
  useEffect(() => {
    if (data.currentStep === 1 && data.expenses.length > 0 && !calendarMonth) {
      const allDates = data.expenses
        .map(e => new Date(e.paymentDate))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (allDates.length > 0) {
        setCalendarMonth(allDates[0]);
      }
    }
  }, [data.currentStep, data.expenses, calendarMonth]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Get equity status colors and message
  const getEquityStatus = (currentEquity: number, minRequired: number, propertyPrice: number) => {
    const percentage = (currentEquity / propertyPrice) * 100;
    const minPercentage = (minRequired / propertyPrice) * 100;
    
    if (currentEquity < minRequired) {
      return {
        bgClass: 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200',
        textClass: 'text-red-900',
        noteClass: 'text-red-700',
        borderClass: 'border-red-300 hover:border-red-400 focus:border-red-500',
        message: `⚠️ הון עצמי נמוך מהמינימום הנדרש (${minPercentage.toFixed(1)}%)`,
        motivation: ''
      };
    } else if (currentEquity === minRequired) {
      return {
        bgClass: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
        textClass: 'text-amber-900',
        noteClass: 'text-amber-700',
        borderClass: 'border-amber-300 hover:border-amber-400 focus:border-amber-500',
        message: `✓ הון עצמי מינימלי ${minPercentage.toFixed(1)}% לפי תקנות בנק ישראל`,
        motivation: '💡 העלאת ההון העצמי תשפר את תנאי המשכנתא ותפחית ריבית'
      };
    } else if (currentEquity < minRequired * 1.2) {
      return {
        bgClass: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
        textClass: 'text-green-900',
        noteClass: 'text-green-700',
        borderClass: 'border-green-300 hover:border-green-400 focus:border-green-500',
        message: `✓ ${percentage.toFixed(1)}% הון עצמי - מעל המינימום!`,
        motivation: '👍 תנאי משכנתא משופרים! המשך להעלות לתנאים עוד יותר טובים'
      };
    } else if (currentEquity < minRequired * 1.5) {
      return {
        bgClass: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300',
        textClass: 'text-emerald-900',
        noteClass: 'text-emerald-700',
        borderClass: 'border-emerald-400 hover:border-emerald-500 focus:border-emerald-600',
        message: `✓ ${percentage.toFixed(1)}% הון עצמי - מצוין!`,
        motivation: '🎉 ריבית מופחתת משמעותית! חיסכון גדול על פני שנות המשכנתא'
      };
    } else {
      return {
        bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300',
        textClass: 'text-blue-900',
        noteClass: 'text-blue-700',
        borderClass: 'border-blue-400 hover:border-blue-500 focus:border-blue-600',
        message: `✓ ${percentage.toFixed(1)}% הון עצמי - מעולה!`,
        motivation: '🌟 תנאי משכנתא מצוינים! ריבית נמוכה במיוחד וחיסכון מקסימלי'
      };
    }
  };

  // Calculate date based on category and target date with distribution
  const calculateExpenseDate = (categoryId: string, targetDate: string, itemIndex: number = 0): string => {
    if (!targetDate) return new Date().toISOString().split('T')[0];
    
    const target = new Date(targetDate);
    
    switch (categoryId) {
      case 'equity':
        // On target date
        break;
      case 'mortgage':
        // 1.5 months before, distributed
        target.setMonth(target.getMonth() - 1);
        target.setDate(target.getDate() - 15 + (itemIndex * 3));
        break;
      case 'legal':
        // 1 month before
        target.setMonth(target.getMonth() - 1);
        target.setDate(target.getDate() + (itemIndex * 2));
        break;
      case 'property-search':
        // 2-3 months before, distributed
        target.setMonth(target.getMonth() - 2);
        target.setDate(target.getDate() - (itemIndex * 7));
        break;
      case 'taxation':
        // Around target date, distributed
        target.setDate(target.getDate() - (itemIndex * 2));
        break;
      case 'logistics':
        // Around target date, distributed
        target.setDate(target.getDate() + (itemIndex * 3));
        break;
      case 'new-home':
        // 1-2 months after, distributed
        target.setMonth(target.getMonth() + 1);
        target.setDate(target.getDate() + (itemIndex * 7));
        break;
      case 'emergency':
        // On target date
        break;
    }
    
    return target.toISOString().split('T')[0];
  };

  // Reset presets flag when going back to step 0
  useEffect(() => {
    if (data.currentStep === 0) {
      setPresetsInitialized(false);
    }
  }, [data.currentStep]);

  // Initialize all presets when entering step 1
  useEffect(() => {
    if (data.currentStep === 1 && !presetsInitialized && data.propertyData.price > 0) {
      const initialExpenses: ExpenseItem[] = [];
      
      // First, add the equity requirement item
      const minEquityRequired = data.propertyData.price * 
        FINANCING_PROFILES[data.propertyData.financingProfile].minEquityPercent;
      
      const equityExpense: ExpenseItem = {
        id: `equity-main-${Date.now()}`,
        categoryId: 'equity',
        description: 'הון עצמי לרכישת הדירה',
        amount: minEquityRequired,
        paymentDate: data.propertyData.targetDate,
        status: 'planned',
        calculationSource: 'percentage',
        percentageOfPrice: FINANCING_PROFILES[data.propertyData.financingProfile].minEquityPercent,
        notes: `הון עצמי מינימלי ${FINANCING_PROFILES[data.propertyData.financingProfile].minEquityPercent * 100}% לפי תקנות בנק ישראל`
      };
      initialExpenses.push(equityExpense);
      
      // Then add all other categories
      CATEGORIES.forEach(category => {
        // Skip equity and empty presets (like emergency category)
        if (category.id === 'equity' || category.presets.length === 0) return;
        
        category.presets.forEach((preset, index) => {
          // Calculate initial amount based on preset type
          let calculatedAmount = 0;
          let calculationSource: 'percentage' | 'fixed' | 'range' = 'fixed';

          if (preset.percentageOfPrice) {
            calculatedAmount = data.propertyData.price * preset.percentageOfPrice;
            calculationSource = 'percentage';
          } else if (preset.minAmount !== undefined && preset.maxAmount !== undefined) {
            // For range, use average as initial value
            calculatedAmount = (preset.minAmount + preset.maxAmount) / 2;
            calculationSource = 'range';
          } else if (preset.defaultAmount !== undefined) {
            calculatedAmount = preset.defaultAmount;
            calculationSource = 'fixed';
          }

          // Calculate dynamic date based on category with distribution
          const expenseDate = calculateExpenseDate(category.id, data.propertyData.targetDate, index);

          const newExpense: ExpenseItem = {
            id: `${category.id}-preset-${index}-${Date.now()}-${index}`,
            categoryId: category.id,
            description: preset.description,
            amount: calculatedAmount,
            paymentDate: expenseDate,
            status: 'planned',
            calculationSource,
            percentageOfPrice: preset.percentageOfPrice,
            minAmount: preset.minAmount,
            maxAmount: preset.maxAmount,
            notes: preset.notes
          };
          
          initialExpenses.push(newExpense);
        });
      });

      setData(prev => ({
        ...prev,
        expenses: initialExpenses
      }));
      setPresetsInitialized(true);
    }
  }, [data.currentStep, data.propertyData.price, data.propertyData.targetDate, data.propertyData.financingProfile, presetsInitialized]);

  // Calculate totals
  const calculateTotals = () => {
    const totalExpenses = data.expenses.reduce((sum, expense) => {
      if (expense.calculationSource === 'range' && expense.minAmount && expense.maxAmount) {
        switch (viewMode) {
          case 'best': return sum + expense.minAmount;
          case 'worst': return sum + expense.maxAmount;
          case 'expected': return sum + ((expense.minAmount + expense.maxAmount) / 2);
        }
      }
      return sum + expense.amount;
    }, 0);

    const minEquityRequired = data.propertyData.price * 
      FINANCING_PROFILES[data.propertyData.financingProfile].minEquityPercent;
    
    const totalEquityNeeded = minEquityRequired + totalExpenses;
    const budgetGap = totalEquityNeeded; // This would be compared against user's available equity

    return {
      totalExpenses,
      minEquityRequired,
      totalEquityNeeded,
      budgetGap,
      percentageOfPrice: data.propertyData.price > 0 ? (totalExpenses / data.propertyData.price) * 100 : 0
    };
  };

  const totals = calculateTotals();

  // Group expenses by category
  const expensesByCategory = data.expenses.reduce((acc, expense) => {
    if (!acc[expense.categoryId]) {
      acc[expense.categoryId] = [];
    }
    acc[expense.categoryId].push(expense);
    return acc;
  }, {} as Record<string, ExpenseItem[]>);

  const addExpenseFromPreset = (categoryId: string, preset: ExpensePreset) => {
    const newExpense: ExpenseItem = {
      id: Date.now().toString(),
      categoryId,
      description: preset.description,
      amount: preset.defaultAmount || 
        (preset.percentageOfPrice ? data.propertyData.price * preset.percentageOfPrice : 0),
      paymentDate: data.propertyData.targetDate,
      status: 'planned',
      calculationSource: preset.percentageOfPrice ? 'percentage' : 
        (preset.minAmount && preset.maxAmount ? 'range' : 'fixed'),
      percentageOfPrice: preset.percentageOfPrice,
      minAmount: preset.minAmount,
      maxAmount: preset.maxAmount,
      notes: preset.notes
    };

    setData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }));
  };

  const updateExpense = (expense: ExpenseItem) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === expense.id ? expense : e)
    }));
    setEditingItem(null);
  };

  const deleteExpense = (expenseId: string) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== expenseId)
    }));
  };

  const duplicateExpense = (expense: ExpenseItem) => {
    const duplicated = {
      ...expense,
      id: Date.now().toString(),
      description: expense.description + ' (עותק)'
    };
    setData(prev => ({
      ...prev,
      expenses: [...prev.expenses, duplicated]
    }));
  };

  // Step 1: Basic Settings
  const renderBasicSettings = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">הגדרות בסיס</h2>
        <p className="text-gray-600">הזינו את פרטי הנכס ופרופיל המימון</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Label htmlFor="propertyPrice" className="text-lg font-medium">מחיר הנכס</Label>
          <Input
            id="propertyPrice"
            type="number"
            placeholder="₪"
            value={data.propertyData.price || ''}
            onChange={(e) => setData(prev => ({
              ...prev,
              propertyData: { ...prev.propertyData, price: parseFloat(e.target.value) || 0 }
            }))}
            className="text-right text-lg mt-2"
          />
        </div>

        <div>
          <Label htmlFor="targetDate" className="text-lg font-medium">תאריך יעד לרכישה</Label>
          <Input
            id="targetDate"
            type="date"
            value={data.propertyData.targetDate}
            onChange={(e) => setData(prev => ({
              ...prev,
              propertyData: { ...prev.propertyData, targetDate: e.target.value }
            }))}
            className="text-right mt-2"
          />
        </div>

        <div>
          <Label className="text-lg font-medium">פרופיל מימון</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {Object.entries(FINANCING_PROFILES).map(([key, profile]) => (
              <Button
                key={key}
                variant={data.propertyData.financingProfile === key ? "default" : "outline"}
                onClick={() => setData(prev => ({
                  ...prev,
                  propertyData: { ...prev.propertyData, financingProfile: key as any }
                }))}
                className="h-16 text-sm"
              >
                <div>
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-xs opacity-70">
                    הון עצמי מינימלי: {profile.minEquityPercent * 100}%
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-6">
          <Button
            onClick={() => setData(prev => ({ ...prev, currentStep: 1 }))}
            disabled={!data.propertyData.price || !data.propertyData.targetDate}
            size="lg"
            className="px-8"
          >
            המשך להוצאות
            <ArrowRight className="w-5 h-5 mr-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // Helper to get category color class
  const getCategoryColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      emerald: 'bg-emerald-100 text-emerald-700',
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      teal: 'bg-teal-100 text-teal-600',
      red: 'bg-red-100 text-red-600',
      amber: 'bg-amber-100 text-amber-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      gray: 'bg-gray-100 text-gray-600'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-600';
  };

  const getCategoryBgColor = (color: string) => {
    const colorMap: Record<string, string> = {
      emerald: '#10B981',
      blue: '#3B82F6',
      green: '#22C55E',
      purple: '#A855F7',
      orange: '#F97316',
      teal: '#14B8A6',
      red: '#EF4444',
      amber: '#F59E0B',
      indigo: '#6366F1',
      gray: '#6B7280'
    };
    return colorMap[color] || '#6B7280';
  };

  // Add new expense to category
  const addNewExpenseToCategory = (categoryId: string) => {
    const newExpense: ExpenseItem = {
      id: Date.now().toString(),
      categoryId,
      description: '',
      amount: 0,
      paymentDate: data.propertyData.targetDate || new Date().toISOString().split('T')[0],
      status: 'planned',
      calculationSource: 'fixed',
      notes: ''
    };
    setData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }));
  };

  // Update expense inline
  const updateExpenseInline = (expenseId: string, field: keyof ExpenseItem, value: any) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => 
        e.id === expenseId ? { ...e, [field]: value } : e
      )
    }));
  };

  // Step 2: Expenses by Categories - COLLAPSIBLE TABLE VIEW
  const renderExpensesByCategories = () => {
    // Calculate pie chart data INCLUDING equity
    const categoryTotals = CATEGORIES.map(category => {
      const categoryExpenses = expensesByCategory[category.id] || [];
      const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      return { ...category, total };
    }).filter(cat => cat.total > 0);

    const totalForPie = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);
    
    // Get equity expense
    const equityExpense = data.expenses.find(e => e.categoryId === 'equity');

    return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main collapsible table - 2/3 width */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-xl border-gray-200">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <PieChart className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-bold">
                        סיכום הוצאות
                        {selectedDate && (
                          <Badge variant="secondary" className="mr-2 bg-white/20 text-white border-white/30">
                            מסונן: {new Date(selectedDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-blue-100">
                        {selectedDate 
                          ? `${data.expenses.filter(e => e.paymentDate === selectedDate).length} סעיפים ביום זה`
                          : `${CATEGORIES.length} קטגוריות | ${data.expenses.length} סעיפים`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold">₪{totals.totalExpenses.toLocaleString()}</div>
                    <div className="text-xs text-blue-100">{totals.percentageOfPrice.toFixed(1)}% מהנכס</div>
                  </div>
                </div>
                {selectedDate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedDate(null)}
                    className="mt-2 text-white hover:bg-white/20"
                  >
                    <X className="w-3 h-3 ml-1" />
                    בטל סינון
                  </Button>
                )}
      </div>

              <CardContent className="p-0">
                {/* Collapsible Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-8"></th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                          קטגוריה
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          תיאור
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                          סכום
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody>
        {CATEGORIES.map((category) => {
                        // Filter expenses by selected date if any
                        let categoryExpenses = (expensesByCategory[category.id] || []).sort((a, b) => 
                          new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
                        );
                        
                        // Apply date filter
                        if (selectedDate) {
                          categoryExpenses = categoryExpenses.filter(exp => exp.paymentDate === selectedDate);
                        }
                        
          const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                        const isExpanded = expandedCategories.has(category.id) || (selectedDate !== null && categoryExpenses.length > 0);
                        const hasItems = categoryExpenses.length > 0;
                        const isEquityCategory = category.id === 'equity';
                        
                        // Skip category if filtered and no expenses
                        if (selectedDate && !hasItems && category.id !== 'equity') {
                          return null;
                        }

                        // Special rendering for equity category
                        if (isEquityCategory && equityExpense) {
                          const minEquityRequired = data.propertyData.price * 
                            FINANCING_PROFILES[data.propertyData.financingProfile].minEquityPercent;
                          const equityStatus = getEquityStatus(equityExpense.amount, minEquityRequired, data.propertyData.price);
          
          return (
                            <tr 
              key={category.id}
                              onClick={() => !isEditingEquity && !isEditingEquityDate && setIsEditingEquityDate(true)}
                              className={`${equityStatus.bgClass} border-b-2 transition-all duration-300 ${!isEditingEquity && !isEditingEquityDate ? 'cursor-pointer hover:shadow-md' : ''}`}
                            >
                              {/* Empty for expand icon */}
                              <td className="px-4 py-4"></td>

                              {/* Category Icon */}
                              <td className="px-4 py-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColorClass(category.color)} shadow-sm transition-transform hover:scale-110`}>
                                  <category.icon className="w-6 h-6" />
                                </div>
                              </td>

                              {/* Category Name & Note */}
                              <td className="px-4 py-4">
                                <div>
                                  <div className={`font-bold text-lg ${equityStatus.textClass}`}>{category.name}</div>
                                  <div className={`text-sm ${equityStatus.noteClass} font-medium mt-1`}>
                                    {equityStatus.message}
                                  </div>
                                  {equityStatus.motivation && (
                                    <div className={`text-xs ${equityStatus.noteClass} mt-2 font-semibold animate-pulse`}>
                                      {equityStatus.motivation}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Amount/Date - Combined column */}
                              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                {isEditingEquityDate ? (
                                  <div className="space-y-2">
                                    {/* Amount */}
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        value={equityExpense.amount || ''}
                                        onChange={(e) => updateExpenseInline(equityExpense.id, 'amount', parseFloat(e.target.value) || 0)}
                                        className={`text-right text-xl font-bold border-2 ${equityStatus.borderClass} bg-white transition-colors pr-10 w-48 ${equityStatus.textClass}`}
                                      />
                                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${equityStatus.noteClass} font-bold`}>₪</span>
                                    </div>
                                    {/* Date */}
                                    <Input
                                      type="date"
                                      value={equityExpense.paymentDate}
                                      onChange={(e) => updateExpenseInline(equityExpense.id, 'paymentDate', e.target.value)}
                                      onBlur={() => setIsEditingEquityDate(false)}
                                      autoFocus
                                      className={`text-right text-sm border-2 ${equityStatus.borderClass} bg-white transition-colors`}
                                    />
                                  </div>
                                ) : isEditingEquity ? (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={equityExpense.amount || ''}
                                      onChange={(e) => updateExpenseInline(equityExpense.id, 'amount', parseFloat(e.target.value) || 0)}
                                      onBlur={() => setIsEditingEquity(false)}
                                      autoFocus
                                      className={`text-right text-xl font-bold border-2 ${equityStatus.borderClass} bg-white transition-colors pr-10 w-48 ${equityStatus.textClass}`}
                                    />
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${equityStatus.noteClass} font-bold`}>₪</span>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => setIsEditingEquity(true)}
                                    className={`text-2xl font-bold ${equityStatus.textClass} cursor-pointer hover:underline transition-all hover:scale-105`}
                                  >
                                    ₪{equityExpense.amount.toLocaleString()}
                                  </div>
                                )}
                              </td>

                              {/* Edit button - opens date editing */}
                              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setIsEditingEquityDate(true)}
                                  className={`h-9 w-9 p-0 hover:bg-emerald-100 transition-colors ${equityStatus.noteClass}`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <Fragment key={category.id}>
                            {/* Category Row - No date column */}
                            <tr 
                              onClick={() => hasItems && toggleCategory(category.id)}
                              className={`${hasItems ? 'cursor-pointer' : ''} bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-150 hover:to-gray-100 transition-all border-b-2 border-gray-200`}
                            >
                              {/* Category Icon */}
                              <td className="px-4 py-4" colSpan={2}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColorClass(category.color)} shadow-sm`}>
                                  <category.icon className="w-6 h-6" />
                                </div>
                              </td>

                              {/* Category Name & Description */}
                              <td className="px-4 py-4">
                                <div>
                                  <div className="font-bold text-lg text-gray-900">{category.name}</div>
                                  <div className="text-sm text-gray-500">{category.description}</div>
                                  {hasItems && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {categoryExpenses.length} {categoryExpenses.length === 1 ? 'סעיף' : 'סעיפים'}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Category Total */}
                              <td className="px-4 py-4">
                                <div className="text-xl font-bold text-gray-900">
                                  ₪{categoryTotal.toLocaleString()}
                                </div>
                              </td>

                              {/* Details button (for categories with items) or empty */}
                              <td className="px-4 py-4">
                                {hasItems && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <motion.div
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronDown className="w-5 h-5" />
                                    </motion.div>
                                    <span className="text-sm font-medium">פירוט</span>
                                  </div>
                                )}
                              </td>
                            </tr>

                            {/* Expandable Sub-Items - WITH date column */}
                            <AnimatePresence mode="sync">
                              {isExpanded && hasItems && (
                                <>
                                  {categoryExpenses.map((expense, index) => (
                                    <motion.tr
                                      key={expense.id}
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-blue-50/30 transition-colors border-b border-gray-100`}
                                    >
                                      {/* Small Category Indicator - same colSpan as parent */}
                                      <td className="px-4 py-3" colSpan={2}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColorClass(category.color)}`}>
                                          <category.icon className="w-4 h-4" />
                                        </div>
                                      </td>

                                      {/* Description - inline edit */}
                                      <td className="px-4 py-3">
                                        <div className="space-y-1">
                                          <Input
                                            value={expense.description}
                                            onChange={(e) => updateExpenseInline(expense.id, 'description', e.target.value)}
                                            placeholder="תיאור ההוצאה"
                                            className="text-right text-sm font-medium border-0 bg-transparent hover:bg-white focus:bg-white transition-colors"
                                          />
                                          {expense.notes && (
                                            <p className="text-xs text-gray-500 pr-3">{expense.notes}</p>
                                          )}
                                          {expense.calculationSource === 'percentage' && expense.percentageOfPrice && (
                                            <p className="text-xs text-blue-600 pr-3 font-medium">
                                              {(expense.percentageOfPrice * 100).toFixed(2)}% ממחיר הנכס
                                            </p>
                                          )}
                                          {expense.calculationSource === 'range' && expense.minAmount && expense.maxAmount && (
                                            <p className="text-xs text-amber-600 pr-3 font-medium">
                                              טווח: ₪{expense.minAmount.toLocaleString()}-₪{expense.maxAmount.toLocaleString()}
                                            </p>
                                          )}
                                        </div>
                                      </td>

                                      {/* Amount + Date - combined in one column */}
                                      <td className="px-4 py-3">
                                        <div className="space-y-2">
                                          {/* Amount */}
                                          <div className="relative">
                                            <Input
                                              type="number"
                                              value={expense.amount || ''}
                                              onChange={(e) => updateExpenseInline(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                                              placeholder="0"
                                              className="text-right text-base font-bold border-0 bg-transparent hover:bg-white focus:bg-white transition-colors pr-2 text-gray-900"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₪</span>
                                          </div>
                                          {/* Date */}
                                          <Input
                                            type="date"
                                            value={expense.paymentDate}
                                            onChange={(e) => updateExpenseInline(expense.id, 'paymentDate', e.target.value)}
                                            className="text-right text-xs border-0 bg-transparent hover:bg-white focus:bg-white transition-colors"
                                          />
                                        </div>
                                      </td>

                                      {/* Delete button */}
                                      <td className="px-4 py-3">
                                        <div className="flex justify-center">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteExpense(expense.id)}
                                            className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </motion.tr>
                                  ))}
                                  
                                  {/* Add new item row */}
                                  <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-gray-50/50 border-b border-gray-200"
                                  >
                                    <td colSpan={5} className="px-4 py-3">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addNewExpenseToCategory(category.id);
                                        }}
                                        className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                      >
                                        <Plus className="w-4 h-4 ml-2" />
                                        הוסף סעיף נוסף
                                      </Button>
                                    </td>
                                  </motion.tr>
                                </>
                              )}
                            </AnimatePresence>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Calendar, Pie chart & Summary - 1/3 width */}
          <div className="lg:col-span-1 space-y-3">
            {/* Calendar - MOVED TO TOP */}
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3 h-3" />
                  לוח תשלומים
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                {(() => {
                  // Group expenses by date
                  const expensesByDate = data.expenses.reduce((acc, expense) => {
                    if (!acc[expense.paymentDate]) {
                      acc[expense.paymentDate] = [];
                    }
                    acc[expense.paymentDate].push(expense);
                    return acc;
                  }, {} as Record<string, ExpenseItem[]>);

                  // Get date range
                  const allDates = data.expenses.map(e => new Date(e.paymentDate).getTime()).filter(d => !isNaN(d));
                  if (allDates.length === 0) {
                    return <p className="text-sm text-gray-500 text-center py-4">אין תשלומים מתוכננים</p>;
                  }

                  const minDate = new Date(Math.min(...allDates));
                  const maxDate = new Date(Math.max(...allDates));
                  
                  // Get current month to display (use calendarMonth state or first expense date)
                  const displayDate = calendarMonth || minDate;
                  
                  const year = displayDate.getFullYear();
                  const month = displayDate.getMonth();

                  // Navigation functions
                  const goToPreviousMonth = () => {
                    const newDate = new Date(displayDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCalendarMonth(newDate);
                  };

                  const goToNextMonth = () => {
                    const newDate = new Date(displayDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCalendarMonth(newDate);
                  };
                  
                  // Get first day of month and last day
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const daysInMonth = lastDay.getDate();
                  const startingDayOfWeek = firstDay.getDay();

                  // Hebrew day names
                  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

                  return (
                    <div className="space-y-0.5">
                      {/* Month/Year header with navigation */}
                      <div className="flex items-center justify-between mb-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={goToPreviousMonth}
                          className="h-5 w-5 p-0"
                        >
                          <ArrowRight className="w-2.5 h-2.5" />
                        </Button>
                        <div className="font-bold text-[10px] text-gray-900">
                          {displayDate.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={goToNextMonth}
                          className="h-5 w-5 p-0"
                        >
                          <ArrowLeft className="w-2.5 h-2.5" />
                        </Button>
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-px bg-gray-200 p-px rounded">
                        {/* Day names */}
                        {dayNames.map(day => (
                          <div key={day} className="text-center text-[8px] font-semibold text-gray-600 bg-white p-0.5">
                            {day}
                          </div>
                        ))}

                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="bg-white" style={{ aspectRatio: '1' }} />
                        ))}

                        {/* Days of month */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayExpenses = expensesByDate[dateStr] || [];
                          const hasExpenses = dayExpenses.length > 0;
                          const isSelected = selectedDate === dateStr;
                          
                          // Get most expensive expense's category for icon
                          const primaryExpense = dayExpenses.length > 0 
                            ? dayExpenses.reduce((prev, current) => (prev.amount > current.amount) ? prev : current)
                            : null;
                          const primaryCategory = primaryExpense 
                            ? CATEGORIES.find(c => c.id === primaryExpense.categoryId)
                            : null;

                          return (
                            <button
                              key={day}
                              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                              className={`
                                p-px text-xs font-medium transition-all relative
                                ${hasExpenses 
                                  ? isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                                  : 'bg-white text-gray-400'
                                }
                              `}
                              style={{ aspectRatio: '1' }}
                            >
                              <div className="flex flex-col items-center justify-center h-full">
                                <span className="text-[7px] font-bold leading-none">{day}</span>
                                {hasExpenses && primaryCategory && (
                                  <div className={`w-2 h-2 rounded-sm flex items-center justify-center mt-px ${
                                    isSelected ? 'bg-white/20' : getCategoryColorClass(primaryCategory.color)
                                  }`}>
                                    <primaryCategory.icon className="w-1 h-1" />
                                  </div>
                                )}
                                {hasExpenses && dayExpenses.length > 1 && (
                                  <span className="absolute top-0 right-0 text-[5px] bg-red-500 text-white rounded-full w-2 h-2 flex items-center justify-center leading-none">
                                    {dayExpenses.length}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected date info - very compact */}
                      {selectedDate && expensesByDate[selectedDate] && expensesByDate[selectedDate].length > 0 && (
                        <div className="mt-1 p-1 bg-blue-50 rounded text-[8px]">
                          <div className="font-bold text-blue-900">
                            {expensesByDate[selectedDate].length} הוצאות | ₪{(expensesByDate[selectedDate].reduce((sum, e) => sum + e.amount, 0) / 1000).toFixed(0)}K
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChart className="w-3 h-3" />
                  חלוקת ההון
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-1 pb-3">
                {/* SVG Pie Chart */}
                {totalForPie > 0 ? (
                  <>
                    <div className="w-full aspect-square flex items-center justify-center max-h-32">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {(() => {
                          let currentAngle = 0;
                          return categoryTotals.map((cat, index) => {
                            const percentage = (cat.total / totalForPie) * 100;
                            const angle = (percentage / 100) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;

                            // Calculate path for pie slice
                            const startRad = (startAngle - 90) * (Math.PI / 180);
                            const endRad = (endAngle - 90) * (Math.PI / 180);
                            const x1 = 100 + 80 * Math.cos(startRad);
                            const y1 = 100 + 80 * Math.sin(startRad);
                            const x2 = 100 + 80 * Math.cos(endRad);
                            const y2 = 100 + 80 * Math.sin(endRad);
                            const largeArc = angle > 180 ? 1 : 0;

                            return (
                              <path
                                key={cat.id}
                                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={getCategoryBgColor(cat.color)}
                                opacity="0.9"
                                className="hover:opacity-100 transition-opacity cursor-pointer"
                              />
                            );
                          });
                        })()}
                        {/* Center white circle for donut effect */}
                        <circle cx="100" cy="100" r="50" fill="white" />
                        <text x="100" y="95" textAnchor="middle" className="text-xs font-bold fill-gray-700">
                          סה״כ
                        </text>
                        <text x="100" y="110" textAnchor="middle" className="text-lg font-bold fill-gray-900">
                          {(totalForPie / 1000).toFixed(0)}K
                        </text>
                      </svg>
                  </div>

                    {/* Legend */}
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {categoryTotals.map((cat) => {
                        const percentage = (cat.total / totalForPie) * 100;
                        return (
                          <div key={cat.id} className="flex items-center justify-between gap-1 p-1 rounded hover:bg-gray-50">
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <div 
                                className="w-2 h-2 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: getCategoryBgColor(cat.color) }}
                              />
                              <span className="text-[10px] font-medium text-gray-700 truncate">{cat.name}</span>
                            </div>
                            <div className="text-left flex-shrink-0">
                              <span className="text-[10px] font-bold text-gray-900">
                                ₪{(cat.total / 1000).toFixed(0)}K
                              </span>
                              <span className="text-[8px] text-gray-500 ml-1">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <PieChart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">הוסיפו הוצאות לצפייה בגרף</p>
                  </div>
                )}
                </CardContent>
              </Card>


            {/* Summary */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-blue-900 text-sm">
                  <Banknote className="w-3 h-3" />
                  סיכום
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5 pt-1 pb-2">
                {/* Property Price */}
                <div className="flex justify-between items-center py-1 border-b border-blue-200">
                  <span className="text-[10px] font-medium text-gray-700">עלות דירה</span>
                  <span className="text-xs font-bold text-gray-900">
                    ₪{(data.propertyData.price / 1000).toFixed(0)}K
                  </span>
                </div>

                {/* Equity */}
                {equityExpense && (
                  <div className="flex justify-between items-center py-1 border-b border-blue-200">
                    <span className="text-[10px] font-medium text-emerald-700">הון עצמי</span>
                    <span className="text-xs font-bold text-emerald-900">
                      ₪{(equityExpense.amount / 1000).toFixed(0)}K
                    </span>
                  </div>
                )}

                {/* Additional Expenses */}
                <div className="flex justify-between items-center py-1 border-b border-blue-200">
                  <span className="text-[10px] font-medium text-orange-700">הוצאות נלוות</span>
                  <span className="text-xs font-bold text-orange-900">
                    ₪{(data.expenses.filter(e => e.categoryId !== 'equity').reduce((sum, e) => sum + e.amount, 0) / 1000).toFixed(0)}K
                  </span>
                </div>

                {/* Total Required */}
                <div className="flex justify-between items-center py-2 bg-blue-600 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg mt-1">
                  <span className="text-xs font-bold text-white">סה״כ נדרש</span>
                  <span className="text-lg font-bold text-white">
                    ₪{(totals.totalExpenses / 1000).toFixed(0)}K
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>

      <div className="flex justify-center gap-4 pt-6">
        <Button
          variant="outline"
          onClick={() => setData(prev => ({ ...prev, currentStep: 0 }))}
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
          חזור
        </Button>
        <Button
          onClick={() => setData(prev => ({ ...prev, currentStep: 2 }))}
          size="lg"
          className="px-8"
        >
          המשך לסיכום
          <ArrowRight className="w-5 h-5 mr-2" />
        </Button>
      </div>
    </motion.div>
  );
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = ['תיאור', 'קטגוריה', 'סכום', 'תאריך תשלום', 'סטטוס', 'הערות'];
    const csvData = data.expenses.map(expense => {
      const category = CATEGORIES.find(c => c.id === expense.categoryId);
      return [
        expense.description,
        category?.name || '',
        expense.amount.toString(),
        expense.paymentDate,
        expense.status === 'paid' ? 'שולם' : expense.status === 'planned' ? 'מתוכנן' : 'ממתין',
        expense.notes
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `תכנון_הון_עצמי_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    // This would integrate with a PDF library like jsPDF
    alert('ייצוא ל-PDF יתווסף בקרוב');
  };

  // Step 3: Summary and Cash Flow
  const renderSummaryAndCashFlow = () => {
    const expensesByMonth = data.expenses.reduce((acc, expense) => {
      const month = new Date(expense.paymentDate).toISOString().substring(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(expense);
      return acc;
    }, {} as Record<string, ExpenseItem[]>);

    const categoryTotals = CATEGORIES.map(category => ({
      ...category,
      total: (expensesByCategory[category.id] || []).reduce((sum, exp) => sum + exp.amount, 0)
    })).filter(cat => cat.total > 0);

    // Timeline data
    const timelineData = Object.entries(expensesByMonth)
      .map(([month, expenses]) => ({
        month,
        total: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        expenses: expenses.length,
        monthName: new Date(month + '-01').toLocaleDateString('he-IL', { year: 'numeric', month: 'long' })
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Status breakdown
    const statusBreakdown = {
      paid: data.expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0),
      planned: data.expenses.filter(e => e.status === 'planned').reduce((sum, e) => sum + e.amount, 0),
      pending: data.expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0)
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">סיכום ותזרים</h2>
          <p className="text-gray-600">סקירה מלאה של ההוצאות והתזרים הצפוי</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">סה״כ הוצאות נלוות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                ₪{totals.totalExpenses.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {totals.percentageOfPrice.toFixed(1)}% ממחיר הנכס
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>שולם: ₪{statusBreakdown.paid.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                  <span>מתוכנן: ₪{statusBreakdown.planned.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                  <span>ממתין: ₪{statusBreakdown.pending.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">הון עצמי מינימלי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ₪{totals.minEquityRequired.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {FINANCING_PROFILES[data.propertyData.financingProfile].minEquityPercent * 100}% ממחיר הנכס
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">סה״כ הון עצמי נדרש</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                ₪{totals.totalEquityNeeded.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                כולל הוצאות נלוות
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">תזרים חודשי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {timelineData.length} חודשים
              </div>
              <div className="text-sm text-gray-600 mt-2">
                פרישת תשלומים
              </div>
              {timelineData.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500">
                    חודש עמוס ביותר: {timelineData.reduce((max, curr) => 
                      curr.total > max.total ? curr : max
                    ).monthName}
                  </div>
                  <div className="text-xs text-gray-500">
                    סכום: ₪{timelineData.reduce((max, curr) => 
                      curr.total > max.total ? curr : max
                    ).total.toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>פירוט לפי קטגוריות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryTotals.map(category => (
                <div key={category.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColorClass(category.color)}`}>
                      <category.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-lg font-bold">
                    ₪{category.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Visualization */}
        {timelineData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                ציר זמן תשלומים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineData.map((timeline, index) => (
                  <div key={timeline.month} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-24 text-sm font-medium text-gray-600">
                      {timeline.monthName}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-lg font-bold">₪{timeline.total.toLocaleString()}</div>
                        <Badge variant="secondary">{timeline.expenses} פריטים</Badge>
                        {timeline.total > 50000 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>חודש עם עומס כספי גבוה</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            timeline.total > 50000 ? 'bg-red-500' :
                            timeline.total > 25000 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (timeline.total / Math.max(...timelineData.map(t => t.total))) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Expenses Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>טבלת סיכום כל ההוצאות</CardTitle>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="paid">שולם</SelectItem>
                    <SelectItem value="planned">מתוכנן</SelectItem>
                    <SelectItem value="pending">ממתין</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">תיאור</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">קטגוריה</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">סכום</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">תאריך</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">סטטוס</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">הערות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.expenses
                    .filter(expense => filterStatus === 'all' || expense.status === filterStatus)
                    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
                    .map((expense) => {
                      const category = CATEGORIES.find(c => c.id === expense.categoryId);
                      return (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-right font-medium">{expense.description}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {category && (
                                <div className={`w-6 h-6 rounded flex items-center justify-center ${getCategoryColorClass(category.color)}`}>
                                  <category.icon className="w-3 h-3" />
                                </div>
                              )}
                              <span className="text-sm">{category?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold">₪{expense.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            {new Date(expense.paymentDate).toLocaleDateString('he-IL')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge 
                              variant={
                                expense.status === 'paid' ? 'default' :
                                expense.status === 'planned' ? 'secondary' : 'destructive'
                              }
                            >
                              {expense.status === 'paid' ? 'שולם' :
                               expense.status === 'planned' ? 'מתוכנן' : 'ממתין'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600 max-w-48 truncate">
                            {expense.notes}
                          </td>
                        </tr>
                      );
                    })}
                  {data.expenses.filter(expense => filterStatus === 'all' || expense.status === filterStatus).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        {filterStatus === 'all' ? 'אין הוצאות להצגה' : `אין הוצאות בסטטוס "${filterStatus === 'paid' ? 'שולם' : filterStatus === 'planned' ? 'מתוכנן' : 'ממתין'}"`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 pt-6">
          <Button
            variant="outline"
            onClick={() => setData(prev => ({ ...prev, currentStep: 1 }))}
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 ml-2" />
            ייצא CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <FileText className="w-4 h-4 ml-2" />
            ייצא PDF
          </Button>
        </div>
      </motion.div>
    );
  };

  // Sidebar Summary
  const renderSidebar = () => (
    <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-4">תקציר</h3>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">סך הוצאות נלוות</div>
            <div className="text-2xl font-bold text-blue-600">
              ₪{totals.totalExpenses.toLocaleString()}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">סך הון עצמי נדרש</div>
            <div className="text-2xl font-bold text-green-600">
              ₪{totals.totalEquityNeeded.toLocaleString()}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">% מתוך המחיר</div>
            <div className="text-2xl font-bold text-purple-600">
              {totals.percentageOfPrice.toFixed(1)}%
            </div>
          </div>
        </Card>
      </div>

      {data.propertyData.price > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">פירוט מהיר</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>מחיר נכס:</span>
              <span>₪{data.propertyData.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>הון עצמי מינימלי:</span>
              <span>₪{totals.minEquityRequired.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>הוצאות נלוות:</span>
              <span>₪{totals.totalExpenses.toLocaleString()}</span>
            </div>
            <div className="border-t pt-1 flex justify-between font-bold">
              <span>סה״כ נדרש:</span>
              <span>₪{totals.totalEquityNeeded.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Category Drawer
  const renderCategoryDrawer = () => {
    if (!selectedCategory) return null;
    
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return null;

    const categoryExpenses = expensesByCategory[selectedCategory] || [];

    return (
      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryColorClass(category.color)}`}>
                <category.icon className="w-5 h-5" />
              </div>
              {category.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add from templates */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => {
                  const newExpense: ExpenseItem = {
                    id: Date.now().toString(),
                    categoryId: selectedCategory,
                    description: '',
                    amount: 0,
                    paymentDate: data.propertyData.targetDate,
                    status: 'planned',
                    calculationSource: 'fixed',
                    notes: ''
                  };
                  setEditingItem(newExpense);
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף סעיף
              </Button>
              
              <Select onValueChange={(value) => {
                const preset = category.presets[parseInt(value)];
                if (preset) {
                  addExpenseFromPreset(selectedCategory, preset);
                }
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="הוסף מתבנית" />
                </SelectTrigger>
                <SelectContent>
                  {category.presets.map((preset, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {preset.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expenses table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">תיאור</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">סכום</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">תאריך</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">סטטוס</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categoryExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-right">
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          {expense.notes && (
                            <div className="text-xs text-gray-500">{expense.notes}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₪{expense.amount.toLocaleString()}
                        {expense.calculationSource === 'percentage' && (
                          <div className="text-xs text-gray-500">
                            {expense.percentageOfPrice! * 100}% ממחיר
                          </div>
                        )}
                        {expense.calculationSource === 'range' && (
                          <div className="text-xs text-gray-500">
                            ₪{expense.minAmount?.toLocaleString()}-₪{expense.maxAmount?.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {new Date(expense.paymentDate).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge 
                          variant={
                            expense.status === 'paid' ? 'default' :
                            expense.status === 'planned' ? 'secondary' : 'destructive'
                          }
                        >
                          {expense.status === 'paid' ? 'שולם' :
                           expense.status === 'planned' ? 'מתוכנן' : 'ממתין'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItem(expense)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateExpense(expense)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteExpense(expense.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categoryExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        אין סעיפים בקטגוריה זו. הוסיפו סעיף חדש או בחרו מתבנית.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">תכנון הון עצמי — הוצאות נלוות</h1>
              <p className="text-gray-600">כלי מקצועי לתכנון וניהול הוצאות רכישת נכס</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-center space-x-8 space-x-reverse">
            {[
              { step: 0, title: 'הגדרות בסיס', description: 'נתוני נכס ומימון' },
              { step: 1, title: 'הוצאות לפי קטגוריות', description: 'הוספה ועריכה מהירה' },
              { step: 2, title: 'סיכום ותזרים', description: 'פירוט וגרפים' }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    data.currentStep >= item.step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {data.currentStep > item.step ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      item.step + 1
                    )}
                  </div>
                  <div className="mr-4">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                </div>
                {index < 2 && (
                  <div className={`w-16 h-1 mx-4 ${
                    data.currentStep > item.step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {data.currentStep === 0 && renderBasicSettings()}
          {data.currentStep === 1 && renderExpensesByCategories()}
          {data.currentStep === 2 && renderSummaryAndCashFlow()}
        </div>

        {/* Category Drawer */}
        {renderCategoryDrawer()}

        {/* Edit Item Dialog */}
        {editingItem && (
          <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem.id ? 'עריכת סעיף' : 'סעיף חדש'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>תיאור</Label>
                  <Input
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      description: e.target.value
                    })}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>סכום</Label>
                  <Input
                    type="number"
                    value={editingItem.amount}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      amount: parseFloat(e.target.value) || 0
                    })}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>תאריך תשלום</Label>
                  <Input
                    type="date"
                    value={editingItem.paymentDate}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      paymentDate: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>סטטוס</Label>
                  <Select 
                    value={editingItem.status} 
                    onValueChange={(value: any) => setEditingItem({
                      ...editingItem,
                      status: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">שולם</SelectItem>
                      <SelectItem value="planned">מתוכנן</SelectItem>
                      <SelectItem value="pending">ממתין</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>הערות</Label>
                  <Input
                    value={editingItem.notes}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      notes: e.target.value
                    })}
                    className="text-right"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingItem(null)}>
                    ביטול
                  </Button>
                  <Button onClick={() => {
                    if (editingItem.id) {
                      updateExpense(editingItem);
                    } else {
                      const newExpense = {
                        ...editingItem,
                        id: Date.now().toString()
                      };
                      setData(prev => ({
                        ...prev,
                        expenses: [...prev.expenses, newExpense]
                      }));
                      setEditingItem(null);
                    }
                  }}>
                    <Save className="w-4 h-4 ml-2" />
                    שמור
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}

