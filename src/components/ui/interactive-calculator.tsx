"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Label } from "./label"
import EquityCalculatorModal from "./equity-calculator-modal"

import { TrendingUp, DollarSign, Calendar, Home, Calculator, Table, Eye, EyeOff, AlertTriangle, HelpCircle, Phone } from "lucide-react"

interface PaymentSchedule {
  month: number;
  principal: number;
  interest: number;
  total: number;
  balance: number;
}

interface InvestmentType {
  name: string;
  maxLTV: number;
  maxTerm: number;
  description: string;
  color: string;
}

const investmentTypes: InvestmentType[] = [
  {
    name: "דירה יחידה",
    maxLTV: 0.75,
    maxTerm: 30,
    description: "משכנתא לדירה ראשונה למגורים",
    color: "blue"
  },
  {
    name: "דירה חליפית",
    maxLTV: 0.70,
    maxTerm: 30,
    description: "משכנתא לדירה שנייה למגורים",
    color: "green"
  },
  {
    name: "דירה שנייה (השקעה)",
    maxLTV: 0.50,
    maxTerm: 30,
    description: "משכנתא לדירה שנייה להשקעה",
    color: "purple"
  },
  {
    name: "משכנתא לכל מטרה",
    maxLTV: 0.50,
    maxTerm: 30,
    description: "משכנתא כללית לכל מטרה",
    color: "orange"
  }
]

export default function InteractiveCalculator() {
  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const parseFormattedNumber = (value: string) => {
    if (!value) return 0
    // Remove commas and other non-digit characters
    const cleanValue = value.replace(/[^\d]/g, '')
    return parseInt(cleanValue) || 0
  }

  const formatNumber = (value: string) => {
    // הסרת פסיקים קיימים וסימנים אחרים
    const cleanValue = value.replace(/[^\d]/g, '')
    if (cleanValue === '') return ''
    
    // הוספת פסיקים
    return new Intl.NumberFormat('he-IL').format(parseInt(cleanValue))
  }

  const formatNumberWithCommas = (value: string) => {
    // הסרת פסיקים קיימים וסימנים אחרים
    const cleanValue = value.replace(/[^\d]/g, '')
    if (cleanValue === '') return ''
    
    // הוספת פסיקים
    const numValue = parseInt(cleanValue)
    if (isNaN(numValue)) return ''
    return new Intl.NumberFormat('he-IL').format(numValue)
  }

  // State
  const [propertyPrice, setPropertyPrice] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [interestRate, setInterestRate] = useState(4.5)
  const [loanTerm, setLoanTerm] = useState(30)
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [otherLoans, setOtherLoans] = useState('')
  const [otherLoansMonths, setOtherLoansMonths] = useState(0)
  const [selectedType, setSelectedType] = useState<InvestmentType>(investmentTypes[0])
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])
  const [calculatorMode, setCalculatorMode] = useState<'initial' | 'loan' | 'refinance'>('initial')
  const [showCalculator, setShowCalculator] = useState(false)
  const [downPaymentMode, setDownPaymentMode] = useState<'manual' | 'calculate'>('manual')
  const [showEquityCalculator, setShowEquityCalculator] = useState(false)
  const [calculatedEquity, setCalculatedEquity] = useState<number>(0)

  // חישובים
  const propertyPriceNum = parseFormattedNumber(propertyPrice) || 1500000
  const downPaymentNum = parseFormattedNumber(downPayment) || 300000
  const monthlyIncomeNum = parseFormattedNumber(monthlyIncome) || 15000
  const otherLoansNum = parseFormattedNumber(otherLoans) || 0


  
  const loanAmount = propertyPriceNum - downPaymentNum
  const monthlyPayment = loanAmount * (interestRate / 100 / 12) * Math.pow(1 + interestRate / 100 / 12, loanTerm * 12) / (Math.pow(1 + interestRate / 100 / 12, loanTerm * 12) - 1)
  const totalPayment = monthlyPayment * loanTerm * 12
  const totalInterest = totalPayment - loanAmount
  const availableIncome = monthlyIncomeNum - otherLoansNum
  const debtToIncomeRatio = availableIncome > 0 ? (monthlyPayment / availableIncome) * 100 : 100
  const ltvRatio = (loanAmount / propertyPriceNum) * 100
  const isLTVExceeded = ltvRatio > selectedType.maxLTV * 100

  // חישוב לוח סילוקין
  const calculateSchedule = () => {
    const principal = loanAmount
    const annualInterestRate = interestRate / 100
    const numberOfPayments = loanTerm * 12
    const monthlyInterestRate = annualInterestRate / 12

    const monthlyPaymentAmount = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)

    const scheduleArr: PaymentSchedule[] = []
    let balance = principal

    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = balance * monthlyInterestRate
      const principalPayment = monthlyPaymentAmount - interestPayment
      balance -= principalPayment

      scheduleArr.push({
        month: i,
        principal: principalPayment,
        interest: interestPayment,
        total: monthlyPaymentAmount,
        balance: Math.max(balance, 0),
      })
    }

    setSchedule(scheduleArr)
    setShowSchedule(true)
  }

  // עדכון הון עצמי לפי LTV מקסימלי
  useEffect(() => {
    const maxLoan = propertyPriceNum * selectedType.maxLTV
    const requiredDownPayment = propertyPriceNum - maxLoan
    if (downPaymentNum < requiredDownPayment) {
      setDownPayment(formatNumberWithCommas(requiredDownPayment.toString()))
    }
  }, [selectedType, propertyPriceNum])

  // עדכון הון עצמי אוטומטי כשמשנים מחיר נכס
  useEffect(() => {
    const maxLoan = propertyPriceNum * selectedType.maxLTV
    const requiredDownPayment = propertyPriceNum - maxLoan
    if (downPaymentNum < requiredDownPayment) {
      setDownPayment(formatNumberWithCommas(requiredDownPayment.toString()))
    }
  }, [propertyPriceNum, selectedType])



  const getDebtRatioMessage = () => {
    if (debtToIncomeRatio > 40) {
      return {
        message: "יחס החזר גבוה והבנק לא יאשר אותו",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        showButton: true,
        buttonText: "פנה אלינו לבניית תמהיל",
        buttonAction: () => alert('נציג שלנו יצור איתך קשר לבניית תמהיל מותאם!')
      }
    } else if (debtToIncomeRatio >= 30) {
      return {
        message: "החזר סביר אך גבולי - מומלץ לשקול בניית תמהיל אחר",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        showButton: true,
        buttonText: "פנה אלינו לבניית תמהיל",
        buttonAction: () => alert('נציג שלנו יצור איתך קשר לבניית תמהיל מותאם!')
      }
    } else {
      return {
        message: "מצוין! יחס החזר נמוך ובריא",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        showButton: false,
        buttonText: "",
        buttonAction: () => {}
      }
    }
  }

  const debtRatioInfo = getDebtRatioMessage()

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">מחשבון משכנתא אינטראקטיבי</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            בחר את סוג המשכנתא שלך וקבל חישוב מדויק
          </p>
        </motion.div>

        {/* Initial Selection Screen */}
        {calculatorMode === 'initial' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCalculatorMode('loan')}>
                <CardContent className="p-8">
                  <div className="text-center">
                    <Home className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-2xl font-bold mb-2">לקיחת משכנתא</h3>
                    <p className="text-gray-600 mb-4">
                      חישוב משכנתא חדשה לרכישת דירה
                    </p>
                    <Button className="w-full">
                      התחל חישוב
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCalculatorMode('refinance')}>
                <CardContent className="p-8">
                  <div className="text-center">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-green-600" />
                    <h3 className="text-2xl font-bold mb-2">מחזר משכנתא</h3>
                    <p className="text-gray-600 mb-4">
                      חישוב מחזור משכנתא קיימת
                    </p>
                    <Button className="w-full">
                      התחל חישוב
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Loan Type Selection Screen */}
        {calculatorMode === 'loan' && !showCalculator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4">בחר סוג דירה</h3>
              <p className="text-gray-600">בחר את סוג הדירה שלך לקבלת חישוב מדויק</p>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {investmentTypes.map((type) => (
                    <Button
                      key={type.name}
                      variant="outline"
                      onClick={() => {
                        setSelectedType(type)
                        setShowCalculator(true)
                      }}
                      className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-shadow"
                    >
                      <span className="font-bold">{type.name}</span>
                      <span className="text-xs opacity-80">{type.description}</span>
                      <span className="text-xs">
                        מקסימום LTV: {type.maxLTV * 100}% | עד {type.maxTerm} שנים
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Calculator */}
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-8">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCalculatorMode('initial')
                  setShowCalculator(false)
                }}
                className="mb-4"
              >
                ← חזור לבחירה
              </Button>
              <h3 className="text-2xl font-bold mb-2">מחשבון משכנתא - {selectedType.name}</h3>
              <p className="text-gray-600">הזן את הפרטים שלך לקבלת חישוב מדויק</p>
            </div>

            {/* בחירת סוג השקעה */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 space-x-reverse">
                    <Home className="w-5 h-5" />
                    <span>סוג השקעה</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {investmentTypes.map((type) => (
                      <Button
                        key={type.name}
                        variant={selectedType.name === type.name ? "default" : "outline"}
                        onClick={() => setSelectedType(type)}
                        className={`h-auto p-4 flex flex-col items-center space-y-2 ${
                          selectedType.name === type.name 
                            ? type.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                              type.color === 'green' ? 'bg-green-500 hover:bg-green-600' :
                              type.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' :
                              'bg-orange-500 hover:bg-orange-600'
                            : ''
                        }`}
                      >
                        <span className="font-bold">{type.name}</span>
                        <span className="text-xs opacity-80">{type.description}</span>
                        <span className="text-xs">
                          מקסימום LTV: {type.maxLTV * 100}% | עד {type.maxTerm} שנים
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 space-x-reverse">
                    <Calculator className="w-5 h-5" />
                    <span>הזנת פרטים</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Property Price */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>מחיר הנכס</Label>
                      <span className="text-lg font-bold text-blue-600">
                        {propertyPrice ? formatCurrency(propertyPriceNum) : 'הזן ערך'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={propertyPrice}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty value
                        if (value === '') {
                          setPropertyPrice('')
                          return
                        }
                        
                        // Allow only digits and commas
                        const cleanValue = value.replace(/[^\d,]/g, '')
                        
                        // Format with commas
                        const formattedValue = formatNumberWithCommas(cleanValue)
                        setPropertyPrice(formattedValue)
                      }}
                      placeholder="1,500,000"
                      className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-blue-500 placeholder:font-medium ${
                        propertyPriceNum < 500000 || propertyPriceNum > 5000000 ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>₪500K</span>
                      <span>₪5M</span>
                    </div>
                    {(propertyPriceNum < 500000 || propertyPriceNum > 5000000) && propertyPrice && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ ערך מחוץ לטווח המותר (₪500K - ₪5M)
                      </div>
                    )}
                  </div>

                  {/* Down Payment Mode Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>הון עצמי</Label>
                      <span className="text-lg font-bold text-green-600">
                        {downPayment ? formatCurrency(downPaymentNum) : 'הזן ערך'}
                      </span>
                    </div>
                    
                    {/* Mode Selection Buttons */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <Button
                        type="button"
                        variant={downPaymentMode === 'manual' ? 'default' : 'outline'}
                        onClick={() => setDownPaymentMode('manual')}
                        className="text-sm"
                      >
                        הזן ידנית
                      </Button>
                      <Button
                        type="button"
                        variant={downPaymentMode === 'calculate' ? 'default' : 'outline'}
                        onClick={() => {
                          setDownPaymentMode('calculate')
                          setShowEquityCalculator(true)
                        }}
                        className="text-sm"
                      >
                        חשב הון עצמי
                      </Button>
                    </div>

                    {/* Manual Input */}
                    {downPaymentMode === 'manual' && (
                      <div>
                        <Input
                          type="text"
                          value={downPayment}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '') {
                              setDownPayment('')
                              return
                            }
                            const cleanValue = value.replace(/[^\d,]/g, '')
                            const formattedValue = formatNumberWithCommas(cleanValue)
                            setDownPayment(formattedValue)
                          }}
                          placeholder="300,000"
                          className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-green-500 placeholder:font-medium ${
                            downPaymentNum < propertyPriceNum * (1 - selectedType.maxLTV) || downPaymentNum > propertyPriceNum * 0.8 ? 'border-red-300' : ''
                          }`}
                        />
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                          <span>{formatCurrency(propertyPriceNum * (1 - selectedType.maxLTV))}</span>
                          <span>{formatCurrency(propertyPriceNum * 0.8)}</span>
                        </div>
                        {(downPaymentNum < propertyPriceNum * (1 - selectedType.maxLTV) || downPaymentNum > propertyPriceNum * 0.8) && downPayment && (
                          <div className="text-xs text-red-600 mt-1">
                            ⚠️ ערך מחוץ לטווח המותר
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calculated Equity Display */}
                    {downPaymentMode === 'calculate' && calculatedEquity > 0 && (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="text-sm text-gray-600">הון עצמי מחושב</div>
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(calculatedEquity)}
                          </div>
                        </div>
                        <Button
                          onClick={() => setShowEquityCalculator(true)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          עדכן חישוב הון
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Loan Amount (Read Only) */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>סכום הלוואה</Label>
                      <span className="text-lg font-bold text-purple-600">
                        {(propertyPrice && downPayment) ? formatCurrency(loanAmount) : 'הזן ערכים'}
                      </span>
                    </div>
                    <div className="w-full p-3 bg-gray-100 rounded-md text-center">
                      <span className="text-sm text-gray-600">
                        מחושב אוטומטית: מחיר הנכס - הון עצמי
                      </span>
                    </div>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>ריבית שנתית</Label>
                      <span className="text-lg font-bold text-purple-600">
                        {interestRate.toFixed(2)}%
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={interestRate}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty value
                        if (value === '') {
                          setInterestRate(4.5)
                          return
                        }
                        
                        // Allow only digits and dots
                        const cleanValue = value.replace(/[^\d.]/g, '')
                        
                        const numValue = parseFloat(cleanValue)
                        
                        // Always update the value if it's a valid number
                        if (!isNaN(numValue)) {
                          setInterestRate(numValue)
                        }
                      }}
                      placeholder="4.5"
                      className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-purple-500 placeholder:font-medium ${
                        interestRate < 2 || interestRate > 8 ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>2%</span>
                      <span>8%</span>
                    </div>
                    {(interestRate < 2 || interestRate > 8) && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ ערך מחוץ לטווח המותר (2% - 8%)
                      </div>
                    )}
                  </div>

                  {/* Loan Term */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>תקופת המשכנתא</Label>
                      <span className="text-lg font-bold text-orange-600">
                        {loanTerm} שנים
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={loanTerm}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty value
                        if (value === '') {
                          setLoanTerm(30)
                          return
                        }
                        
                        // Allow only digits
                        const cleanValue = value.replace(/[^\d]/g, '')
                        
                        const numValue = parseInt(cleanValue)
                        
                        // Always update the value if it's a valid number
                        if (!isNaN(numValue)) {
                          setLoanTerm(numValue)
                        }
                      }}
                      placeholder="30"
                      className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-orange-500 placeholder:font-medium ${
                        loanTerm < 10 || loanTerm > selectedType.maxTerm ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>10 שנים</span>
                      <span>{selectedType.maxTerm} שנים</span>
                    </div>
                    {(loanTerm < 10 || loanTerm > selectedType.maxTerm) && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ ערך מחוץ לטווח המותר (10 - {selectedType.maxTerm} שנים)
                      </div>
                    )}
                  </div>

                  {/* Monthly Income */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>הכנסה חודשית</Label>
                      <span className="text-lg font-bold text-indigo-600">
                        {monthlyIncome ? formatCurrency(monthlyIncomeNum) : 'הזן ערך'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={monthlyIncome}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty value
                        if (value === '') {
                          setMonthlyIncome('')
                          return
                        }
                        
                        // Allow only digits and commas
                        const cleanValue = value.replace(/[^\d,]/g, '')
                        
                        // Format with commas
                        const formattedValue = formatNumberWithCommas(cleanValue)
                        setMonthlyIncome(formattedValue)
                      }}
                      placeholder="15,000"
                      className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-indigo-500 placeholder:font-medium ${
                        monthlyIncomeNum < 8000 || monthlyIncomeNum > 50000 ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>₪8K</span>
                      <span>₪50K</span>
                    </div>
                    {(monthlyIncomeNum < 8000 || monthlyIncomeNum > 50000) && monthlyIncome && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ ערך מחוץ לטווח המותר (₪8K - ₪50K)
                      </div>
                    )}
                  </div>

                  {/* Other Loans */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>הלוואות לתקופה של יותר מ-18 חודשים</Label>
                      <span className="text-lg font-bold text-red-600">
                        {otherLoans ? formatCurrency(otherLoansNum) : 'הזן ערך'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={otherLoans}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty value
                        if (value === '') {
                          setOtherLoans('')
                          return
                        }
                        
                        // Allow only digits and commas
                        const cleanValue = value.replace(/[^\d,]/g, '')
                        
                        // Format with commas
                        const formattedValue = formatNumberWithCommas(cleanValue)
                        setOtherLoans(formattedValue)
                      }}
                      placeholder="0"
                      className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-red-500 placeholder:font-medium ${
                        otherLoansNum < 0 || otherLoansNum > monthlyIncomeNum ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      סכום החזר חודשי של הלוואות קיימות
                    </div>
                    {(otherLoansNum < 0 || otherLoansNum > monthlyIncomeNum) && otherLoans && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ ערך מחוץ לטווח המותר (0 - {formatCurrency(monthlyIncomeNum)})
                      </div>
                    )}
                  </div>

                  {/* Other Loans Months */}
                  {otherLoansNum > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>תקופה שנשארה (חודשים)</Label>
                        <span className="text-lg font-bold text-orange-600">
                          {otherLoansMonths} חודשים
                        </span>
                      </div>
                      <Input
                        type="text"
                        value={otherLoansMonths}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty value
                          if (value === '') {
                            setOtherLoansMonths(0)
                            return
                          }
                          
                          // Allow only digits
                          const cleanValue = value.replace(/[^\d]/g, '')
                          
                          const numValue = parseInt(cleanValue)
                          
                          // Always update the value if it's a valid number
                          if (!isNaN(numValue)) {
                            setOtherLoansMonths(numValue)
                          }
                        }}
                        placeholder="60"
                        className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-orange-500 placeholder:font-medium ${
                          otherLoansMonths < 1 || otherLoansMonths > 300 ? 'border-red-300' : ''
                        }`}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        מספר החודשים שנשארו לשלם את ההלוואה
                      </div>
                      {(otherLoansMonths < 1 || otherLoansMonths > 300) && (
                        <div className="text-xs text-red-600 mt-1">
                          ⚠️ ערך מחוץ לטווח המותר (1 - 300 חודשים)
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results */}
              <div className="space-y-6">
                {/* Main Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 space-x-reverse">
                      <DollarSign className="w-5 h-5" />
                      <span>תוצאות החישוב</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      key={`${propertyPriceNum}-${interestRate}-${loanTerm}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">תשלום חודשי</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(monthlyPayment)}
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">סכום הלוואה</div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(loanAmount)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">סך ריביות</div>
                          <div className="text-xl font-bold text-purple-600">
                            {formatCurrency(totalInterest)}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">יחס החזר</div>
                          <div className="text-xl font-bold text-orange-600">
                            {debtToIncomeRatio.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* LTV Ratio */}
                      <div className={`p-4 rounded-lg ${isLTVExceeded ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">יחס הלוואה (LTV)</span>
                          <span className={`font-bold ${isLTVExceeded ? 'text-red-600' : 'text-green-600'}`}>
                            {ltvRatio.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          מקסימום מותר: {selectedType.maxLTV * 100}%
                        </div>
                        {isLTVExceeded && (
                          <div className="mt-3 p-3 bg-red-100 rounded-lg">
                            <div className="flex items-center space-x-2 space-x-reverse mb-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-semibold text-red-800">
                                הון עצמי אינו מספיק
                              </span>
                            </div>
                            <p className="text-xs text-red-700 mb-3">
                              ההון העצמי הנוכחי אינו מספיק לרכישת נכס זה. נדרש הון עצמי של לפחות {formatCurrency(propertyPriceNum * (1 - selectedType.maxLTV))}.
                            </p>
                            <Button 
                              size="sm" 
                              className="w-full bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                alert('נציג שלנו יצור איתך קשר בקרוב לעזור בגיוס הון עצמי נוסף!')
                              }}
                            >
                              <HelpCircle className="w-4 h-4 ml-2" />
                              בוא נעזור לך לגייס הון עצמי גבוה יותר
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Affordability Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 space-x-reverse">
                      <TrendingUp className="w-5 h-5" />
                      <span>ניתוח יכולת החזר</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>יחס החזר</span>
                        <span className={`font-bold ${debtRatioInfo.color}`}>
                          {debtToIncomeRatio.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full ${
                            debtToIncomeRatio <= 30 ? 'bg-green-500' : 
                            debtToIncomeRatio <= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(debtToIncomeRatio, 100)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      
                      <div className={`p-3 rounded-lg border ${debtRatioInfo.bgColor} ${debtRatioInfo.borderColor}`}>
                        <div className={`text-sm font-semibold ${debtRatioInfo.color}`}>
                          {debtRatioInfo.message}
                        </div>
                        {otherLoansNum > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            הכנסה זמינה: {formatCurrency(availableIncome)} (הכנסה - הלוואות קיימות)
                          </div>
                        )}
                        {debtRatioInfo.showButton && (
                          <Button 
                            size="sm" 
                            className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                            onClick={debtRatioInfo.buttonAction}
                          >
                            <Phone className="w-4 h-4 ml-2" />
                            {debtRatioInfo.buttonText}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Amortization Schedule Button */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 space-x-reverse">
                      <Table className="w-5 h-5" />
                      <span>לוח סילוקין</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => {
                        if (showSchedule) {
                          setShowSchedule(false)
                        } else {
                          calculateSchedule()
                        }
                      }}
                      className="w-full"
                      variant={showSchedule ? "outline" : "default"}
                    >
                      {showSchedule ? (
                        <>
                          <EyeOff className="w-4 h-4 ml-2" />
                          הסתר לוח סילוקין
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 ml-2" />
                          הצג לוח סילוקין מלא
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* לוח סילוקין מלא */}
            <AnimatePresence>
              {showSchedule && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.4 }}
                  className="mt-8"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 space-x-reverse">
                        <Table className="w-5 h-5" />
                        <span>לוח סילוקין מלא</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto max-h-96 border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-right font-semibold">חודש</th>
                              <th className="px-4 py-3 text-right font-semibold">קרן</th>
                              <th className="px-4 py-3 text-right font-semibold">ריבית</th>
                              <th className="px-4 py-3 text-right font-semibold">סה"כ תשלום</th>
                              <th className="px-4 py-3 text-right font-semibold">יתרה</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.map((payment, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2 text-right">{payment.month}</td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {formatCurrency(payment.principal)}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {formatCurrency(payment.interest)}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold">
                                  {formatCurrency(payment.total)}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {formatCurrency(payment.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">סה"כ החזר</div>
                          <div className="text-xl font-bold text-blue-600">
                            {formatCurrency(totalPayment)}
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">סך ריביות</div>
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(totalInterest)}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">החזר לשקל</div>
                          <div className="text-xl font-bold text-purple-600">
                            {(totalPayment / loanAmount).toFixed(3)} ₪
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Equity Calculator Modal */}
        <EquityCalculatorModal
          isOpen={showEquityCalculator}
          onClose={() => setShowEquityCalculator(false)}
          onApplyEquity={(equity) => {
            setCalculatedEquity(equity)
            setDownPayment(formatNumberWithCommas(equity.toString()))
            setDownPaymentMode('calculate')
          }}
          propertyPrice={propertyPriceNum}
        />
      </div>
    </section>
  )
}