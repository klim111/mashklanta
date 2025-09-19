"use client";

import { useState, useEffect } from "react";
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
  Target
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

// Categories with presets
const CATEGORIES: Category[] = [
  {
    id: 'bank',
    name: 'בנק ומשכנתא',
    icon: HomeIcon,
    description: 'עמלות בנק, שמאי, וכל הנוגע למשכנתא',
    color: 'blue',
    presets: [
      {
        description: 'פתיחת תיק משכנתא',
        percentageOfPrice: 0.0025,
        notes: 'בדרך כלל 0.25% ממחיר הנכס'
      },
      {
        description: 'שמאי בנק',
        minAmount: 2000,
        maxAmount: 3500,
        notes: 'בין 2,000-3,500 ₪ בהתאם לערך הנכס'
      },
      {
        description: 'ביטוח מבנה',
        percentageOfPrice: 0.001,
        notes: 'כ-0.1% ממחיר הנכס לשנה'
      }
    ]
  },
  {
    id: 'legal',
    name: 'משפטי ומיסוי',
    icon: FileText,
    description: 'עורך דין, מיסים וכל הנוגע לרכישה',
    color: 'green',
    presets: [
      {
        description: 'עורך דין',
        defaultAmount: 8000,
        notes: 'בדרך כלל 6,000-12,000 ₪'
      },
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
    id: 'brokerage',
    name: 'תיווך ועמלות',
    icon: TrendingUp,
    description: 'מתווך, עמלות מכירה ורכישה',
    color: 'purple',
    presets: [
      {
        description: 'עמלת מתווך',
        percentageOfPrice: 0.02,
        notes: '2% ממחיר הנכס + מע"ם'
      },
      {
        description: 'עמלת מכירה (אם רלוונטי)',
        percentageOfPrice: 0.02,
        notes: 'אם מוכרים נכס קיים'
      }
    ]
  },
  {
    id: 'property',
    name: 'נכס ושיפוצים',
    icon: Settings,
    description: 'שיפוצים, ציוד ועלויות הכנה',
    color: 'orange',
    presets: [
      {
        description: 'שיפוצים בסיסיים',
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
        description: 'ריהוט בסיסי',
        defaultAmount: 40000,
        notes: 'מיטות, ארונות, שולחן וכו\''
      }
    ]
  },
  {
    id: 'moving',
    name: 'מעבר והובלה',
    icon: Target,
    description: 'עלויות מעבר, הובלה ואחסון',
    color: 'teal',
    presets: [
      {
        description: 'חברת הובלה',
        defaultAmount: 3000,
        notes: 'תלוי בכמות החפצים ובמרחק'
      },
      {
        description: 'אחסון זמני',
        defaultAmount: 2000,
        notes: 'אם יש צורך באחסון'
      }
    ]
  },
  {
    id: 'other',
    name: 'אחר',
    icon: Calculator,
    description: 'הוצאות נוספות שלא נכללו בקטגוריות',
    color: 'gray',
    presets: [
      {
        description: 'חירום ובלתי צפוי',
        percentageOfPrice: 0.02,
        notes: '2% מהמחיר לבלתי צפוי'
      }
    ]
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

  // Step 2: Expenses by Categories
  const renderExpensesByCategories = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">הוצאות לפי קטגוריות</h2>
        <p className="text-gray-600">הוסיפו והתאימו את ההוצאות הנלוות</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((category) => {
          const categoryExpenses = expensesByCategory[category.id] || [];
          const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
          
          return (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                  selectedCategory === category.id ? 'border-blue-500' : 'border-gray-200'
                }`}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setIsDrawerOpen(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      category.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      category.color === 'green' ? 'bg-green-100 text-green-600' :
                      category.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      category.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                      category.color === 'teal' ? 'bg-teal-100 text-teal-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <category.icon className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary">
                      {categoryExpenses.length} פריטים
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                  <div className="text-2xl font-bold text-gray-900">
                    ₪{categoryTotal.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
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
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      category.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      category.color === 'green' ? 'bg-green-100 text-green-600' :
                      category.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      category.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                      category.color === 'teal' ? 'bg-teal-100 text-teal-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
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
                                <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                  category.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                  category.color === 'green' ? 'bg-green-100 text-green-600' :
                                  category.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                  category.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                  category.color === 'teal' ? 'bg-teal-100 text-teal-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
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
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                category.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                category.color === 'green' ? 'bg-green-100 text-green-600' :
                category.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                category.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                category.color === 'teal' ? 'bg-teal-100 text-teal-600' :
                'bg-gray-100 text-gray-600'
              }`}>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">תכנון הון עצמי — הוצאות נלוות</h1>
              <p className="text-gray-600">כלי מקצועי לתכנון וניהול הוצאות רכישת נכס</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 ml-2" />
              הוסף סעיף
            </Button>
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

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {data.currentStep === 0 && renderBasicSettings()}
            {data.currentStep === 1 && renderExpensesByCategories()}
            {data.currentStep === 2 && renderSummaryAndCashFlow()}
          </div>

          {/* Sidebar */}
          {renderSidebar()}
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
