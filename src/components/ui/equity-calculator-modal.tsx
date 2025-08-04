"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Badge } from "./badge"
import { Progress } from "./progress"
import { 
  Calculator, 
  DollarSign, 
  Home, 
  FileText, 
  Building, 
  Truck, 
  ShoppingCart, 
  CreditCard,
  Info,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  X,
  ArrowRight,
  Save,
  Download
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

interface EquityCalculator {
  availableFunds: string;
  brokerage: string;
  lawyerFees: string;
  purchaseTax: string;
  capitalGainsTax: string;
  bettermentTax: string;
  renovations: string;
  movingCosts: string;
  furnitureAppliances: string;
  mortgageCosts: string;
}

interface EquityCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyEquity: (equity: number) => void;
  propertyPrice: number;
  isFirstHome?: boolean; // האם זו דירה ראשונה או נוספת
}

interface ExpenseCategory {
  id: keyof EquityCalculator;
  label: string;
  icon: React.ReactNode;
  description: string;
  placeholder: string;
  defaultValue?: string;
  tooltip?: string;
  isRequired?: boolean;
  isAutoCalculated?: boolean;
}

const expenseCategories: ExpenseCategory[] = [
  {
    id: 'brokerage',
    label: 'תיווך',
    icon: <Building className="w-4 h-4" />,
    description: 'עמלות תיווך (2% מערך הנכס)',
    placeholder: '0',
    tooltip: 'עמלות תיווך נקבעות בדרך כלל כ-2% מערך הנכס'
  },
  {
    id: 'lawyerFees',
    label: 'שכר טרחה עו"ד',
    icon: <FileText className="w-4 h-4" />,
    description: 'עלויות עו"ד לטקסיס',
    placeholder: '5,500',
    defaultValue: '5500',
    tooltip: 'עלות ממוצעת של 5,500 ₪ לעו"ד לטקסיס'
  },
  {
    id: 'purchaseTax',
    label: 'מס רכישה',
    icon: <DollarSign className="w-4 h-4" />,
    description: 'מס רכישה על הנכס',
    placeholder: '0',
    tooltip: 'מס רכישה נקבע לפי ערך הנכס ומצב הרכישה',
    isAutoCalculated: true
  },
  {
    id: 'capitalGainsTax',
    label: 'מס שבח',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'מס שבח הון',
    placeholder: '0',
    tooltip: 'מס על רווח הון ממכירת נכס'
  },
  {
    id: 'bettermentTax',
    label: 'היטל השבחה',
    icon: <Building className="w-4 h-4" />,
    description: 'היטל השבחה עירוני',
    placeholder: '0',
    tooltip: 'היטל השבחה נקבע על ידי העירייה'
  },
  {
    id: 'renovations',
    label: 'שיפוצים',
    icon: <Home className="w-4 h-4" />,
    description: 'עלויות שיפוץ ושיפורים',
    placeholder: '0',
    tooltip: 'עלויות שיפוץ ושיפורים בנכס'
  },
  {
    id: 'movingCosts',
    label: 'מעבר דירה',
    icon: <Truck className="w-4 h-4" />,
    description: 'עלויות מעבר דירה',
    placeholder: '0',
    tooltip: 'עלויות הובלה ומעבר דירה'
  },
  {
    id: 'furnitureAppliances',
    label: 'קניות לדירה',
    icon: <ShoppingCart className="w-4 h-4" />,
    description: 'ריהוט ומכשירי חשמל',
    placeholder: '0',
    tooltip: 'ריהוט ומכשירי חשמל לדירה החדשה'
  },
  {
    id: 'mortgageCosts',
    label: 'עלויות משכנתא',
    icon: <CreditCard className="w-4 h-4" />,
    description: 'עלויות לקיחת משכנתא',
    placeholder: '0',
    tooltip: 'עלויות עו"ד משכנתאות ועמלות בנק'
  }
]

export default function EquityCalculatorModal({
  isOpen,
  onClose,
  onApplyEquity,
  propertyPrice,
  isFirstHome: initialIsFirstHome = true // ברירת מחדל לדירה ראשונה
}: EquityCalculatorModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [currentTab, setCurrentTab] = useState<'required' | 'optional'>('required')
  const [isFirstHome, setIsFirstHome] = useState(initialIsFirstHome)
  const [equityCalculator, setEquityCalculator] = useState<EquityCalculator>({
    availableFunds: '',
    brokerage: '',
    lawyerFees: '5500',
    purchaseTax: '',
    capitalGainsTax: '',
    bettermentTax: '',
    renovations: '',
    movingCosts: '',
    furnitureAppliances: '',
    mortgageCosts: ''
  })

  // Helper functions
  const parseFormattedNumber = (value: string) => {
    if (!value) return 0
    const cleanValue = value.replace(/[^\d]/g, '')
    return parseInt(cleanValue) || 0
  }

  // Calculate purchase tax based on property value and home type
  const calculatePurchaseTax = (propertyValue: number, isFirstHome: boolean): { tax: number; explanation: string } => {
    if (propertyValue <= 0) {
      return { tax: 0, explanation: 'שווי הנכס חייב להיות חיובי' }
    }

    let tax = 0
    let explanation = ''

    if (isFirstHome) {
      // דירה יחידה - מדרגות מס רכישה
      if (propertyValue <= 1978745) {
        tax = 0
        explanation = 'שווי הדירה נמוך מהמינימום המחייב במס רכישה – אין חבות במס'
      } else if (propertyValue <= 2347040) {
        // 3.5% על הסכום מעל 1,978,745
        tax = Math.round((propertyValue - 1978745) * 0.035)
        explanation = 'המס חושב לפי מדרגות מס רכישה לדירה יחידה לפי שווי הנכס'
      } else if (propertyValue <= 6055070) {
        // 3.5% על הסכום בין 1,978,745 ל־2,347,040 + 5% על השאר
        const firstBracket = 2347040 - 1978745
        const secondBracket = propertyValue - 2347040
        tax = Math.round(firstBracket * 0.035 + secondBracket * 0.05)
        explanation = 'המס חושב לפי מדרגות מס רכישה לדירה יחידה לפי שווי הנכס'
      } else if (propertyValue <= 20183565) {
        // 3.5% על הסכום בין 1,978,745 ל־2,347,040 + 5% על הסכום בין 2,347,040 ל־6,055,070 + 8% על השאר
        const firstBracket = 2347040 - 1978745
        const secondBracket = 6055070 - 2347040
        const thirdBracket = propertyValue - 6055070
        tax = Math.round(firstBracket * 0.035 + secondBracket * 0.05 + thirdBracket * 0.08)
        explanation = 'המס חושב לפי מדרגות מס רכישה לדירה יחידה לפי שווי הנכס'
      } else {
        // 3.5% על הסכום בין 1,978,745 ל־2,347,040 + 5% על הסכום בין 2,347,040 ל־6,055,070 + 8% על הסכום בין 6,055,070 ל־20,183,565 + 10% על השאר
        const firstBracket = 2347040 - 1978745
        const secondBracket = 6055070 - 2347040
        const thirdBracket = 20183565 - 6055070
        const fourthBracket = propertyValue - 20183565
        tax = Math.round(firstBracket * 0.035 + secondBracket * 0.05 + thirdBracket * 0.08 + fourthBracket * 0.10)
        explanation = 'המס חושב לפי מדרגות מס רכישה לדירה יחידה לפי שווי הנכס'
      }
    } else {
      // דירה נוספת - מדרגות מס רכישה
      if (propertyValue <= 6055070) {
        tax = Math.round(propertyValue * 0.08)
        explanation = 'המס חושב לפי מדרגות מס רכישה לדירה נוספת לפי שווי הנכס'
      } else {
        // 8% על הסכום עד 6,055,070 + 10% על השאר
        const firstBracket = 6055070
        const secondBracket = propertyValue - 6055070
        tax = Math.round(firstBracket * 0.08 + secondBracket * 0.10)
        explanation = 'המס חושב לפי מדרגות מס רכישה לדירה נוספת לפי שווי הנכס'
      }
    }

    return { tax, explanation }
  }

  const formatNumberWithCommas = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '')
    if (cleanValue === '') return ''
    const numValue = parseInt(cleanValue)
    if (isNaN(numValue)) return ''
    return new Intl.NumberFormat('he-IL').format(numValue)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate equity
  const calculateEquity = () => {
    const availableFunds = parseFormattedNumber(equityCalculator.availableFunds) || 0
    const brokerage = parseFormattedNumber(equityCalculator.brokerage) || (propertyPrice * 0.02)
    const lawyerFees = parseFormattedNumber(equityCalculator.lawyerFees) || 5500
    
    // Calculate purchase tax automatically
    const purchaseTaxCalculation = calculatePurchaseTax(propertyPrice, isFirstHome)
    const purchaseTax = parseFormattedNumber(equityCalculator.purchaseTax) || purchaseTaxCalculation.tax
    
    const capitalGainsTax = parseFormattedNumber(equityCalculator.capitalGainsTax) || 0
    const bettermentTax = parseFormattedNumber(equityCalculator.bettermentTax) || 0
    const renovations = parseFormattedNumber(equityCalculator.renovations) || 0
    const movingCosts = parseFormattedNumber(equityCalculator.movingCosts) || 0
    const furnitureAppliances = parseFormattedNumber(equityCalculator.furnitureAppliances) || 0
    const mortgageCosts = parseFormattedNumber(equityCalculator.mortgageCosts) || 0

    const totalExpenses = brokerage + lawyerFees + purchaseTax + capitalGainsTax + 
                         bettermentTax + renovations + movingCosts + furnitureAppliances + mortgageCosts

    return {
      availableFunds,
      totalExpenses,
      remainingEquity: availableFunds - totalExpenses,
      purchaseTaxCalculation
    }
  }

  const equityCalculation = calculateEquity()

  // Update brokerage and purchase tax automatically when property price changes
  useEffect(() => {
    if (propertyPrice > 0) {
      const brokerageAmount = propertyPrice * 0.02
      const purchaseTaxCalculation = calculatePurchaseTax(propertyPrice, isFirstHome)
      
      setEquityCalculator(prev => ({
        ...prev,
        brokerage: formatNumberWithCommas(brokerageAmount.toString()),
        purchaseTax: formatNumberWithCommas(purchaseTaxCalculation.tax.toString())
      }))
    }
  }, [propertyPrice, isFirstHome])

  // Update equity value
  const updateEquityValue = (field: keyof EquityCalculator, value: string) => {
    setEquityCalculator(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Apply calculated equity
  const applyCalculatedEquity = () => {
    if (equityCalculation.remainingEquity > 0) {
      onApplyEquity(equityCalculation.remainingEquity)
      onClose()
    }
  }

  const handleInputChange = (field: keyof EquityCalculator, value: string) => {
    if (value === '') {
      updateEquityValue(field, '')
      return
    }
    const cleanValue = value.replace(/[^\d,]/g, '')
    const formattedValue = formatNumberWithCommas(cleanValue)
    updateEquityValue(field, formattedValue)
  }

  const getProgressPercentage = () => {
    if (currentStep === 1) return 33
    if (currentStep === 2 && currentTab === 'required') return 66
    if (currentStep === 2 && currentTab === 'optional') return 83
    if (currentStep === 3) return 100
    return 0
  }

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return equityCalculator.availableFunds !== ''
    }
    if (currentStep === 2) {
      // אם אנחנו בתאב של ההוצאות הנדרשות, עבור לתאב הנוספות
      if (currentTab === 'required') {
        return true
      }
      // אם אנחנו בתאב של ההוצאות הנוספות, עבור לסיכום
      if (currentTab === 'optional') {
        return true
      }
    }
    return true
  }

  const nextStep = () => {
    if (currentStep === 1 && canProceedToNextStep()) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (currentTab === 'required') {
        setCurrentTab('optional')
      } else if (currentTab === 'optional') {
        setCurrentStep(3)
      }
    }
  }

  const prevStep = () => {
    if (currentStep === 2) {
      if (currentTab === 'optional') {
        setCurrentTab('required')
      } else if (currentTab === 'required') {
        setCurrentStep(1)
      }
    } else if (currentStep === 3) {
      setCurrentStep(2)
      setCurrentTab('optional')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6" />
                  <h3 className="text-2xl font-bold">מחשבון הון עצמי</h3>
                </div>
                <div className="flex items-center gap-4">
                  {/* Home Type Selector */}
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFirstHome(true)}
                      className={`text-white hover:bg-white/20 px-3 py-1 rounded-md text-sm transition-all ${
                        isFirstHome ? 'bg-white/20 font-semibold' : 'opacity-70'
                      }`}
                    >
                      דירה ראשונה
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFirstHome(false)}
                      className={`text-white hover:bg-white/20 px-3 py-1 rounded-md text-sm transition-all ${
                        !isFirstHome ? 'bg-white/20 font-semibold' : 'opacity-70'
                      }`}
                    >
                      דירה נוספת
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white hover:bg-white/20 p-2 rounded-full bg-black/20 backdrop-blur-sm"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>
                    {currentStep === 1 ? 'הון פנוי' : 
                     currentStep === 2 && currentTab === 'required' ? 'הוצאות נדרשות' :
                     currentStep === 2 && currentTab === 'optional' ? 'הוצאות נוספות' :
                     'סיכום'}
                  </span>
                  <span>{Math.round(getProgressPercentage())}%</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
                
                {/* Step Indicators */}
                <div className="flex justify-center mt-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentStep >= 1 ? 'bg-white scale-110' : 'bg-white/40'}`} />
                    <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentStep >= 2 ? 'bg-white scale-110' : 'bg-white/40'}`} />
                    <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentStep >= 3 ? 'bg-white scale-110' : 'bg-white/40'}`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <TooltipProvider>
                {/* Step 1: Available Funds */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <DollarSign className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold mb-2">מה הסכום הפנוי שיש בידך?</h4>
                      <p className="text-gray-600">הזן את הסכום הפנוי שלך לחישוב הון עצמי</p>
                    </div>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-lg font-semibold">סכום פנוי</Label>
                            <Input
                              type="text"
                              value={equityCalculator.availableFunds}
                              onChange={(e) => handleInputChange('availableFunds', e.target.value)}
                              placeholder="הזן סכום"
                              className="w-full mt-2 text-lg text-center"
                            />
                            <p className="text-sm text-gray-600 mt-2 text-center">
                              אל דאגה אם לא יהיה מספיק, נעזור לך לגייס הון נוסף
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Step 2: Expenses */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold mb-2">הוצאות רכישה</h4>
                      <p className="text-gray-600">
                        {currentTab === 'required' 
                          ? 'הזן את ההוצאות הנדרשות לרכישת הנכס' 
                          : 'הזן הוצאות נוספות (אופציונלי)'}
                      </p>
                    </div>

                    <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'required' | 'optional')} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="required">הוצאות נדרשות</TabsTrigger>
                        <TabsTrigger value="optional">הוצאות נוספות</TabsTrigger>
                      </TabsList>
                      
                      {currentTab === 'required' && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            💡 <strong>טיפ:</strong> הוצאות נדרשות הן הוצאות שחייבים לשלם בעת רכישת נכס. 
                            תוכל לדלג על הוצאות נוספות אם אינך צפוי להוציא עליהן.
                          </p>
                        </div>
                      )}
                      
                      {currentTab === 'optional' && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            💡 <strong>אופציונלי:</strong> הוצאות נוספות הן הוצאות שעשויות להיות נדרשות בהמשך. 
                            אם אינך צפוי להוציא עליהן, תוכל לדלג לסיכום.
                          </p>
                        </div>
                      )}
                     
                      <TabsContent value="required" className="space-y-4">
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {expenseCategories.slice(0, 5).map((category) => (
                            <Card key={category.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  {category.icon}
                                  <div className="flex-1">
                                    <Label className="font-semibold">{category.label}</Label>
                                    {category.tooltip && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="w-4 h-4 text-gray-400 ml-1" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{category.tooltip}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                                <Input
                                  type="text"
                                  value={equityCalculator[category.id]}
                                  onChange={(e) => handleInputChange(category.id, e.target.value)}
                                  placeholder={category.placeholder}
                                  className={`w-full ${category.isAutoCalculated ? 'bg-blue-50 border-blue-200' : ''}`}
                                  readOnly={category.isAutoCalculated}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {category.isAutoCalculated && category.id === 'purchaseTax' 
                                    ? equityCalculation.purchaseTaxCalculation.explanation
                                    : category.description
                                  }
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </motion.div>
                      </TabsContent>

                      <TabsContent value="optional" className="space-y-4">
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {expenseCategories.slice(5).map((category) => (
                            <Card key={category.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  {category.icon}
                                  <div className="flex-1">
                                    <Label className="font-semibold">{category.label}</Label>
                                    {category.tooltip && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="w-4 h-4 text-gray-400 ml-1" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{category.tooltip}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                                <Input
                                  type="text"
                                  value={equityCalculator[category.id]}
                                  onChange={(e) => handleInputChange(category.id, e.target.value)}
                                  placeholder={category.placeholder}
                                  className={`w-full ${category.isAutoCalculated ? 'bg-blue-50 border-blue-200' : ''}`}
                                  readOnly={category.isAutoCalculated}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {category.isAutoCalculated && category.id === 'purchaseTax' 
                                    ? equityCalculation.purchaseTaxCalculation.explanation
                                    : category.description
                                  }
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </motion.div>
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}

                {/* Step 3: Results */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold mb-2">סיכום החישוב</h4>
                      <p className="text-gray-600">הנה הסיכום של הון עצמי זמין</p>
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          💡 <strong>טיפ:</strong> אם התוצאה חיובית, תוכל להזין את ההון העצמי למחשבון המשכנתא. 
                          אם התוצאה שלילית, נעזור לך לגייס הון נוסף.
                        </p>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4 text-center">
                          <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-sm text-gray-600">הון פנוי</div>
                          <div className="text-xl font-bold text-blue-600">
                            {formatCurrency(equityCalculation.availableFunds)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4 text-center">
                          <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          <div className="text-sm text-gray-600">סה"כ הוצאות</div>
                          <div className="text-xl font-bold text-red-600">
                            {formatCurrency(equityCalculation.totalExpenses)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={`${equityCalculation.remainingEquity >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <CardContent className="p-4 text-center">
                          <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${equityCalculation.remainingEquity >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                          <div className="text-sm text-gray-600">הון עצמי זמין</div>
                          <div className={`text-xl font-bold ${equityCalculation.remainingEquity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(equityCalculation.remainingEquity)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Status Message */}
                    {equityCalculation.remainingEquity >= 0 ? (
                      <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                              <div className="font-semibold text-green-800">מצוין!</div>
                              <div className="text-sm text-green-700">
                                יש לך מספיק הון עצמי לרכישת הנכס
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <div>
                              <div className="font-semibold text-red-800">חסר הון עצמי</div>
                              <div className="text-sm text-red-700">
                                נדרש הון נוסף של {formatCurrency(Math.abs(equityCalculation.remainingEquity))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                                         {/* Purchase Tax Details */}
                     {equityCalculation.purchaseTaxCalculation.tax > 0 && (
                       <Card className="border-blue-200 bg-blue-50">
                         <CardHeader>
                           <CardTitle className="flex items-center gap-2 text-blue-800">
                             <DollarSign className="w-5 h-5" />
                             פרטי חישוב מס רכישה
                           </CardTitle>
                         </CardHeader>
                         <CardContent>
                           <div className="space-y-3">
                             <div className="flex justify-between items-center">
                               <span className="text-sm text-blue-700">סוג דירה:</span>
                               <span className="font-semibold text-blue-800">
                                 {isFirstHome ? 'דירה ראשונה' : 'דירה נוספת'}
                               </span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-sm text-blue-700">שווי נכס:</span>
                               <span className="font-semibold text-blue-800">
                                 {formatCurrency(propertyPrice)}
                               </span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-sm text-blue-700">מס רכישה:</span>
                               <span className="font-semibold text-blue-800">
                                 {formatCurrency(equityCalculation.purchaseTaxCalculation.tax)}
                               </span>
                             </div>
                             <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                               <p className="text-xs text-blue-600">
                                 {equityCalculation.purchaseTaxCalculation.explanation}
                               </p>
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                     )}

                     {/* Expense Breakdown */}
                     <Card>
                       <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                           <FileText className="w-5 h-5" />
                           פירוט הוצאות
                         </CardTitle>
                       </CardHeader>
                       <CardContent>
                         <div className="space-y-2">
                           {expenseCategories.map((category) => {
                             const amount = parseFormattedNumber(equityCalculator[category.id])
                             if (amount === 0) return null
                             
                             return (
                               <div key={category.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                                 <div className="flex items-center gap-2">
                                   {category.icon}
                                   <span className="text-sm">{category.label}</span>
                                 </div>
                                 <span className="font-semibold">{formatCurrency(amount)}</span>
                               </div>
                             )
                           })}
                         </div>
                       </CardContent>
                     </Card>
                  </motion.div>
                )}
              </TooltipProvider>

              {/* Navigation Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-between mt-6 pt-6 border-t"
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    חזור
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-2"
                >
                  {currentStep < 3 ? (
                    <>
                      {currentStep === 2 && currentTab === 'required' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCurrentTab('optional')
                              setCurrentStep(3)
                            }}
                            className="flex items-center gap-2"
                          >
                            דלג לסיכום
                          </Button>
                        </motion.div>
                      )}
                      {currentStep === 2 && currentTab === 'optional' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Button
                            variant="outline"
                            onClick={() => setCurrentStep(3)}
                            className="flex items-center gap-2"
                          >
                            דלג לסיכום
                          </Button>
                        </motion.div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Button
                          onClick={nextStep}
                          disabled={!canProceedToNextStep()}
                          className="flex items-center gap-2"
                        >
                          {currentStep === 2 && currentTab === 'required' ? 'הוצאות נוספות' : 
                           currentStep === 2 && currentTab === 'optional' ? 'סיכום' : 'המשך'}
                          <ArrowRight className="w-4 h-4 rotate-180" />
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-2"
                      >
                        <Button
                          variant="outline"
                          onClick={onClose}
                          className="flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          שמור
                        </Button>
                        <Button
                          onClick={applyCalculatedEquity}
                          disabled={equityCalculation.remainingEquity <= 0}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          הזן למחשבון המשכנתא
                        </Button>
                      </motion.div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 