"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Label } from "./label"
import EquityCalculatorModal from "./equity-calculator-modal"

import { TrendingUp, DollarSign, Calendar, Home, Calculator, Table, Eye, EyeOff, AlertTriangle, HelpCircle, Phone, Upload } from "lucide-react"

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

interface LoanTrack {
  id: string;
  name: string;
  category: 'fixed' | 'variable';
  averageRate: number;
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

const loanTracks: LoanTrack[] = [
  // Fixed Rate Tracks
  {
    id: 'kalatz',
    name: 'קל"ץ',
    category: 'fixed',
    averageRate: 3.8,
    description: 'ריבית קבועה לא צמודה',
    color: 'blue'
  },
  {
    id: 'katz',
    name: 'ק"צ',
    category: 'fixed',
    averageRate: 4.2,
    description: 'ריבית קבועה צמודה',
    color: 'green'
  },
  // Variable Rate Tracks
  {
    id: 'gilad',
    name: 'משתנה על בסיס אג"ח',
    category: 'variable',
    averageRate: 3.5,
    description: 'ריבית משתנה על בסיס אג"ח ממשלתיות',
    color: 'purple'
  },
  {
    id: 'prime',
    name: 'פריים',
    category: 'variable',
    averageRate: 4.5,
    description: 'ריבית משתנה על בסיס ריבית הפריים',
    color: 'orange'
  },
  {
    id: 'gilad_tzomad',
    name: 'משתנה על בסיס אג"ח צמודה',
    category: 'variable',
    averageRate: 3.9,
    description: 'ריבית משתנה על בסיס אג"ח צמודה למדד',
    color: 'indigo'
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

  // Percent parsing helper for refinance inputs (allows decimals)
  const parsePercent = (value: string) => {
    if (!value) return 0
    const clean = value.replace(/[^\d.]/g, '')
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : parsed
  }

  // Generic amortization helpers used in refinance flow
  const computeMonthlyPayment = (principal: number, annualRatePercent: number, termYears: number) => {
    if (principal <= 0 || annualRatePercent < 0 || termYears <= 0) return 0
    const monthlyRate = (annualRatePercent / 100) / 12
    const n = Math.round(termYears * 12)
    if (monthlyRate === 0) return principal / n
    const factor = Math.pow(1 + monthlyRate, n)
    return principal * monthlyRate * factor / (factor - 1)
  }

  // Solve for number of months given principal, rate and desired monthly payment
  const computeTermMonthsForPayment = (principal: number, annualRatePercent: number, monthlyPayment: number) => {
    if (principal <= 0 || annualRatePercent < 0 || monthlyPayment <= 0) return 0
    const r = (annualRatePercent / 100) / 12
    if (r === 0) {
      return Math.ceil(principal / monthlyPayment)
    }
    // If payment is not enough to cover interest, no solution
    if (monthlyPayment <= principal * r) return 0
    const numerator = Math.log(monthlyPayment / (monthlyPayment - principal * r))
    const denominator = Math.log(1 + r)
    const months = Math.ceil(numerator / denominator)
    return months
  }

  // State
  const [propertyPrice, setPropertyPrice] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [selectedLoanTrack, setSelectedLoanTrack] = useState<LoanTrack | null>(null)
  const [loanTerm, setLoanTerm] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [otherLoans, setOtherLoans] = useState('')
  const [otherLoansMonths, setOtherLoansMonths] = useState('')
  const [selectedType, setSelectedType] = useState<InvestmentType>(investmentTypes[0])
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])
  const [calculatorMode, setCalculatorMode] = useState<'initial' | 'loan' | 'refinance'>('initial')
  const [showCalculator, setShowCalculator] = useState(false)
  const [downPaymentMode, setDownPaymentMode] = useState<'manual' | 'calculate'>('manual')
  const [showEquityCalculator, setShowEquityCalculator] = useState(false)
  const [calculatedEquity, setCalculatedEquity] = useState<number>(0)

  // Refinance state
  const [currentBalance, setCurrentBalance] = useState('')
  const [currentRate, setCurrentRate] = useState('') // percent input as string
  const [currentRemainingTerm, setCurrentRemainingTerm] = useState('') // years
  const [selectedRefiTrack, setSelectedRefiTrack] = useState<LoanTrack | null>(null)
  const [refiCosts, setRefiCosts] = useState('')
  const [refiNewTerm, setRefiNewTerm] = useState('') // years for the lower-payment option

  // Upload + OCR state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null)
  const [ocrSummary, setOcrSummary] = useState<null | {
    principalOutstanding: number | null
    currentRatePercent: number | null
    remainingTermYears: number | null
    trackType: string | null
    linkage: string | null
  }>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)

  // Debug logging
  console.log('Current state values:', {
    propertyPrice,
    downPayment,
    selectedLoanTrack,
    loanTerm,
    monthlyIncome,
    otherLoans,
    otherLoansMonths
  })

  // חישובים
  const propertyPriceNum = parseFormattedNumber(propertyPrice) || 0
  const downPaymentNum = parseFormattedNumber(downPayment) || 0
  const monthlyIncomeNum = parseFormattedNumber(monthlyIncome) || 0
  const otherLoansNum = parseFormattedNumber(otherLoans) || 0
  const interestRateNum = selectedLoanTrack ? selectedLoanTrack.averageRate : 0
  const loanTermNum = parseInt(loanTerm) || 0
  const otherLoansMonthsNum = parseInt(otherLoansMonths) || 0

  // Derived values for new-loan calculator
  const hasRequiredFields = Boolean(propertyPrice && downPayment && selectedLoanTrack && loanTerm)
  const loanAmount = hasRequiredFields ? Math.max(propertyPriceNum - downPaymentNum, 0) : 0
  const monthlyPayment = hasRequiredFields && loanAmount > 0 && loanTermNum > 0
    ? (() => {
        const r = (interestRateNum / 100) / 12
        const n = loanTermNum * 12
        if (r === 0) return loanAmount / n
        const factor = Math.pow(1 + r, n)
        return loanAmount * r * factor / (factor - 1)
      })()
    : 0
  const totalPayment = hasRequiredFields ? monthlyPayment * loanTermNum * 12 : 0
  const totalInterest = hasRequiredFields ? Math.max(totalPayment - loanAmount, 0) : 0
  const availableIncome = Math.max(monthlyIncomeNum - otherLoansNum, 0)
  const debtToIncomeRatio = hasRequiredFields && availableIncome > 0 ? (monthlyPayment / availableIncome) * 100 : 0
  const ltvRatio = hasRequiredFields && propertyPriceNum > 0 ? (loanAmount / propertyPriceNum) * 100 : 0
  const isLTVExceeded = hasRequiredFields ? ltvRatio > (selectedType.maxLTV * 100) : false

  // Refinance derived values
  const currentBalanceNum = parseFormattedNumber(currentBalance) || 0
  const currentRateNum = parsePercent(currentRate) || 0
  const currentRemainingTermNum = parseInt(currentRemainingTerm) || 0
  const selectedRefiRateNum = selectedRefiTrack ? selectedRefiTrack.averageRate : 0
  const refiCostsNum = parseFormattedNumber(refiCosts) || 0
  const refiNewTermNum = parseInt(refiNewTerm) || 0
  const hasRefiRequired = Boolean(currentBalance && currentRate && currentRemainingTerm && selectedRefiTrack)

  // Current plan metrics
  const currentMonthlyPayment = hasRefiRequired 
    ? computeMonthlyPayment(currentBalanceNum, currentRateNum, currentRemainingTermNum) 
    : 0
  const currentTotalPayment = hasRefiRequired ? currentMonthlyPayment * currentRemainingTermNum * 12 : 0
  const currentTotalInterest = hasRefiRequired ? currentTotalPayment - currentBalanceNum : 0

  // Option A: Lower monthly payment (user chooses new term)
  const lowerPaymentMonthly = hasRefiRequired && refiNewTermNum > 0 
    ? computeMonthlyPayment(currentBalanceNum, selectedRefiRateNum, refiNewTermNum)
    : 0
  const lowerPaymentTotalPayment = hasRefiRequired && refiNewTermNum > 0 
    ? lowerPaymentMonthly * refiNewTermNum * 12 + refiCostsNum
    : 0
  const lowerPaymentTotalInterest = hasRefiRequired && refiNewTermNum > 0 
    ? lowerPaymentTotalPayment - currentBalanceNum
    : 0
  const lowerPaymentSavings = hasRefiRequired && refiNewTermNum > 0 
    ? currentTotalInterest - lowerPaymentTotalInterest
    : 0

  // Option B: Shorten period (keep current monthly payment, solve for new term)
  const shortenMonths = hasRefiRequired && currentMonthlyPayment > 0
    ? computeTermMonthsForPayment(currentBalanceNum, selectedRefiRateNum, currentMonthlyPayment)
    : 0
  const shortenYears = shortenMonths > 0 ? shortenMonths / 12 : 0
  const shortenTotalPayment = shortenMonths > 0 ? (currentMonthlyPayment * shortenMonths) + refiCostsNum : 0
  const shortenTotalInterest = shortenMonths > 0 ? shortenTotalPayment - currentBalanceNum : 0
  const shortenSavings = shortenMonths > 0 ? currentTotalInterest - shortenTotalInterest : 0

  // Upload helpers
  const presignUpload = async (file: File) => {
    const res = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    })
    if (!res.ok) throw new Error('Presign failed')
    return res.json() as Promise<{ key: string; url: string; method: string; headers: Record<string,string> }>
  }

  const uploadToS3 = async (url: string, headers: Record<string,string>, file: File) => {
    const putRes = await fetch(url, { method: 'PUT', headers, body: file })
    if (!putRes.ok) throw new Error('Upload failed')
  }

  const createDocumentFromKey = async (key: string) => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Key: key }),
    })
    if (!res.ok) throw new Error('OCR failed')
    return res.json()
  }

  const onSelectImage = async (file: File) => {
    try {
      setIsUploading(true)
      setOcrError(null)
      setOcrSummary(null)
      setUploadedPreviewUrl(URL.createObjectURL(file))

      const presigned = await presignUpload(file)
      await uploadToS3(presigned.url, presigned.headers, file)

      const doc = await createDocumentFromKey(presigned.key)
      const parsed = (doc?.parsedJson ?? {}) as any

      // Auto-fill fields if present
      if (parsed.principalOutstanding) {
        setCurrentBalance(formatNumberWithCommas(String(Math.round(parsed.principalOutstanding))))
      }
      if (parsed.currentRatePercent) {
        setCurrentRate(String(parsed.currentRatePercent))
      }
      if (parsed.remainingTermYears) {
        setCurrentRemainingTerm(String(Math.round(parsed.remainingTermYears)))
      }
      // Optionally select track
      const trackMap: Record<string, string> = {
        kalatz: 'kalatz',
        katz: 'katz',
        prime: 'prime',
        gilad: 'gilad',
        variable: 'gilad',
      }
      if (parsed.trackType && trackMap[parsed.trackType]) {
        const t = loanTracks.find(t => t.id === trackMap[parsed.trackType]) || null
        setSelectedRefiTrack(t)
      }

      setOcrSummary({
        principalOutstanding: parsed.principalOutstanding ?? null,
        currentRatePercent: parsed.currentRatePercent ?? null,
        remainingTermYears: parsed.remainingTermYears ?? null,
        trackType: parsed.trackType ?? null,
        linkage: parsed.linkage ?? null,
      })
    } catch (err: any) {
      setOcrError(err?.message ?? 'שגיאה בהעלאת המסמך')
    } finally {
      setIsUploading(false)
    }
  }

  // חישוב לוח סילוקין
  const calculateSchedule = () => {
    const principal = loanAmount
    const annualInterestRate = interestRateNum / 100
    const numberOfPayments = loanTermNum * 12
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

  // חישוב הון עצמי מינימלי נדרש
  const requiredDownPayment = propertyPrice ? propertyPriceNum * (1 - selectedType.maxLTV) : 0
  const calculatedDownPayment = propertyPrice && downPayment ? propertyPriceNum - loanAmount : 0



  const getDebtRatioMessage = () => {
    if (!hasRequiredFields) {
      return {
        message: "הזן את כל הפרטים הנדרשים לקבלת חישוב",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        showButton: false,
        buttonText: "",
        buttonAction: () => {}
      }
    } else if (debtToIncomeRatio > 40) {
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

        {/* Refinance Calculator Screen */}
        {calculatorMode === 'refinance' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="text-center mb-8">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCalculatorMode('initial')
                }}
                className="mb-4"
              >
                ← חזור לבחירה
              </Button>
              <h3 className="text-2xl font-bold mb-2">מחזור משכנתא</h3>
              <p className="text-gray-600">השווה בין שתי אפשרויות: הורדת תשלום חודשי או קיצור התקופה להקטנת סך הריבית</p>
            </div>

            {/* New: Upload payoff schedule image first */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> העלה צילום לוח סילוקין</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" /> בחר תמונה
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) onSelectImage(f)
                      }}
                    />
                  </label>
                  {isUploading && <span className="text-sm text-gray-600">מעלה ומנתח מסמך…</span>}
                  {ocrError && <span className="text-sm text-red-600">{ocrError}</span>}
                </div>
                {uploadedPreviewUrl && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1">
                      {/* Preview */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedPreviewUrl} alt="תצוגה מקדימה" className="rounded border w-full object-contain max-h-56" />
                    </div>
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <div className="text-sm text-blue-800">יתרת הלוואה מזוהה</div>
                          <div className="text-lg font-bold text-blue-900">{ocrSummary?.principalOutstanding ? formatCurrency(ocrSummary.principalOutstanding) : '—'}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded p-3">
                          <div className="text-sm text-purple-800">ריבית מזוהה</div>
                          <div className="text-lg font-bold text-purple-900">{ocrSummary?.currentRatePercent ? `${ocrSummary.currentRatePercent.toFixed(2)}%` : '—'}</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded p-3">
                          <div className="text-sm text-orange-800">יתרת תקופה</div>
                          <div className="text-lg font-bold text-orange-900">{ocrSummary?.remainingTermYears ? `${Math.round(ocrSummary.remainingTermYears)} שנים` : '—'}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="text-sm text-green-800">מסלול</div>
                          <div className="text-lg font-bold text-green-900">{ocrSummary?.trackType ? ocrSummary.trackType : '—'} {ocrSummary?.linkage ? `(${ocrSummary.linkage})` : ''}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Current Mortgage Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 space-x-reverse">
                    <Home className="w-5 h-5" />
                    <span>פרטי המשכנתא הנוכחית</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>יתרת הלוואה</Label>
                      <span className="text-lg font-bold text-blue-600">
                        {currentBalance ? formatCurrency(currentBalanceNum) : 'הזן ערך'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={currentBalance}
                      autoComplete="off"
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '') { setCurrentBalance(''); return }
                        const clean = v.replace(/[^\d,]/g, '')
                        setCurrentBalance(formatNumberWithCommas(clean))
                      }}
                      className="w-full text-left border-2 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>יתרת תקופה (שנים)</Label>
                      <span className="text-lg font-bold text-orange-600">
                        {currentRemainingTermNum > 0 ? `${currentRemainingTermNum} שנים` : 'הזן ערך'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={currentRemainingTerm}
                      autoComplete="off"
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '') { setCurrentRemainingTerm(''); return }
                        const clean = v.replace(/[^\d]/g, '')
                        if (clean) setCurrentRemainingTerm(clean)
                      }}
                      className="w-full text-left border-2 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>ריבית נוכחית (%)</Label>
                      <span className="text-lg font-bold text-purple-600">
                        {currentRate ? `${parsePercent(currentRate).toFixed(2)}%` : 'הזן ערך'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={currentRate}
                      autoComplete="off"
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '') { setCurrentRate(''); return }
                        const clean = v.replace(/[^\d.]/g, '')
                        setCurrentRate(clean)
                      }}
                      placeholder="3.80"
                      className="w-full text-left border-2 focus:border-purple-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">שיעור ריבית שנתי ממוצע</div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">תשלום חודשי (נוכחי):</span>
                      <span className="font-semibold text-blue-700">{hasRefiRequired ? formatCurrency(currentMonthlyPayment) : '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">סך ריביות שנותרו:</span>
                      <span className="font-semibold text-purple-700">{hasRefiRequired ? formatCurrency(currentTotalInterest) : '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New Refinance Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 space-x-reverse">
                    <TrendingUp className="w-5 h-5" />
                    <span>תנאי המחזור החדשים</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Select new track */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>מסלול ריבית חדש</Label>
                      <span className="text-lg font-bold text-green-600">
                        {selectedRefiTrack ? `${selectedRefiTrack.name} (${selectedRefiRateNum.toFixed(2)}%)` : 'בחר מסלול'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {loanTracks.map((track) => (
                        <Button
                          key={track.id}
                          variant={selectedRefiTrack?.id === track.id ? 'default' : 'outline'}
                          onClick={() => setSelectedRefiTrack(track)}
                          className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                            selectedRefiTrack?.id === track.id
                              ? track.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                                track.color === 'green' ? 'bg-green-500 hover:bg-green-600' :
                                track.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' :
                                track.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
                                'bg-indigo-500 hover:bg-indigo-600'
                              : ''
                          }`}
                        >
                          <span className="font-bold">{track.name}</span>
                          <span className="text-xs opacity-80">{track.description}</span>
                          <span className="text-xs">{track.averageRate.toFixed(2)}%</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Refinance costs */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>עלויות מחזור (אופציונלי)</Label>
                      <span className="text-lg font-bold text-red-600">
                        {refiCosts ? formatCurrency(refiCostsNum) : '—'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={refiCosts}
                      autoComplete="off"
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '') { setRefiCosts(''); return }
                        const clean = v.replace(/[^\d,]/g, '')
                        setRefiCosts(formatNumberWithCommas(clean))
                      }}
                      placeholder="0"
                      className="w-full text-left border-2 focus:border-red-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">עמלות, קנסות פירעון מוקדם, עו"ד, שמאי וכו'</div>
                  </div>

                  {/* Option A: Lower monthly payment */}
                  <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-blue-800">אפשרות א': הורדת תשלום חודשי</div>
                      <div className="text-sm text-blue-700">בחר תקופה חדשה (שנים)</div>
                    </div>
                    <Input
                      type="text"
                      value={refiNewTerm}
                      autoComplete="off"
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '') { setRefiNewTerm(''); return }
                        const clean = v.replace(/[^\d]/g, '')
                        if (clean) setRefiNewTerm(clean)
                      }}
                      placeholder={currentRemainingTerm || '20'}
                      className="w-full text-left border-2 focus:border-blue-500 mb-3"
                    />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-md p-3">
                        <div className="text-gray-600">תשלום חודשי חדש</div>
                        <div className="text-lg font-bold text-blue-700">{hasRefiRequired && refiNewTermNum > 0 ? formatCurrency(lowerPaymentMonthly) : '—'}</div>
                      </div>
                      <div className="bg-white rounded-md p-3">
                        <div className="text-gray-600">סך ריביות (כולל עלויות)</div>
                        <div className="text-lg font-bold text-purple-700">{hasRefiRequired && refiNewTermNum > 0 ? formatCurrency(lowerPaymentTotalInterest) : '—'}</div>
                      </div>
                      <div className="bg-white rounded-md p-3 col-span-2">
                        <div className="text-gray-600">חיסכון מוערך בריביות</div>
                        <div className="text-lg font-bold text-green-700">{hasRefiRequired && refiNewTermNum > 0 ? formatCurrency(lowerPaymentSavings) : '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Option B: Shorten period */}
                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-green-800">אפשרות ב': קיצור התקופה</div>
                      <div className="text-sm text-green-700">תשלום חודשי נשאר דומה לנוכחי</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-md p-3">
                        <div className="text-gray-600">תקופה חדשה (שנים)</div>
                        <div className="text-lg font-bold text-green-700">{shortenYears > 0 ? `${(shortenYears).toFixed(1)} שנים` : '—'}</div>
                      </div>
                      <div className="bg-white rounded-md p-3">
                        <div className="text-gray-600">סך ריביות (כולל עלויות)</div>
                        <div className="text-lg font-bold text-purple-700">{shortenMonths > 0 ? formatCurrency(shortenTotalInterest) : '—'}</div>
                      </div>
                      <div className="bg-white rounded-md p-3 col-span-2">
                        <div className="text-gray-600">חיסכון מוערך בריביות</div>
                        <div className="text-lg font-bold text-green-700">{shortenMonths > 0 ? formatCurrency(shortenSavings) : '—'}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary comparison */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-gray-600">סך ריביות נוכחי</div>
                  <div className="text-xl font-bold text-gray-800">{hasRefiRequired ? formatCurrency(currentTotalInterest) : '—'}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-blue-700">חיסכון - הורדת תשלום</div>
                  <div className={`text-xl font-bold ${lowerPaymentSavings >= 0 ? 'text-blue-800' : 'text-red-600'}`}>{hasRefiRequired && refiNewTermNum > 0 ? formatCurrency(lowerPaymentSavings) : '—'}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-green-700">חיסכון - קיצור תקופה</div>
                  <div className={`text-xl font-bold ${shortenSavings >= 0 ? 'text-green-800' : 'text-red-600'}`}>{shortenMonths > 0 ? formatCurrency(shortenSavings) : '—'}</div>
                </CardContent>
              </Card>
            </div>
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
                      autoComplete="off"
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
                      placeholder=""
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
                          autoComplete="off"
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
                          placeholder=""
                          className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-green-500 placeholder:font-medium ${
                            downPaymentNum < requiredDownPayment || downPaymentNum > propertyPriceNum * 0.8 ? 'border-red-300' : ''
                          }`}
                        />
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">הון עצמי מינימלי נדרש:</span>
                            <span className="font-medium text-blue-600">{propertyPrice ? formatCurrency(requiredDownPayment) : 'הזן ערכים'}</span>
                          </div>
                          {downPayment && propertyPrice && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">הון עצמי מחושב:</span>
                              <span className="font-medium text-green-600">{formatCurrency(calculatedDownPayment)}</span>
                            </div>
                          )}
                        </div>
                        {(downPaymentNum < requiredDownPayment || downPaymentNum > propertyPriceNum * 0.8) && downPayment && (
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

                  {/* Loan Track Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>מסלול הלוואה</Label>
                      <span className="text-lg font-bold text-purple-600">
                        {selectedLoanTrack ? selectedLoanTrack.name + ' (' + selectedLoanTrack.averageRate.toFixed(2) + '%)' : 'בחר מסלול'}
                      </span>
                    </div>
                                         <div className="space-y-4">
                       {/* Fixed Rate Tracks */}
                       <div>
                         <h4 className="text-sm font-semibold text-gray-700 mb-2">ריביות קבועות</h4>
                         <div className="grid grid-cols-2 gap-2">
                           {loanTracks.filter(track => track.category === 'fixed').map((track) => (
                             <Button
                               key={track.id}
                               variant={selectedLoanTrack?.id === track.id ? "default" : "outline"}
                               onClick={() => setSelectedLoanTrack(track)}
                               className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                                 selectedLoanTrack?.id === track.id
                                   ? track.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                                     track.color === 'green' ? 'bg-green-500 hover:bg-green-600' :
                                     track.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' :
                                     track.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
                                     'bg-indigo-500 hover:bg-indigo-600'
                                   : ''
                               }`}
                             >
                               <span className="font-bold">{track.name}</span>
                               <span className="text-xs opacity-80">{track.description}</span>
                               <span className="text-xs">
                                 ממוצע: {track.averageRate.toFixed(2)}%
                               </span>
                             </Button>
                           ))}
                         </div>
                       </div>
                       
                       {/* Variable Rate Tracks */}
                       <div>
                         <h4 className="text-sm font-semibold text-gray-700 mb-2">ריביות משתנות</h4>
                         <div className="grid grid-cols-2 gap-2">
                           {loanTracks.filter(track => track.category === 'variable').map((track) => (
                             <Button
                               key={track.id}
                               variant={selectedLoanTrack?.id === track.id ? "default" : "outline"}
                               onClick={() => setSelectedLoanTrack(track)}
                               className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                                 selectedLoanTrack?.id === track.id
                                   ? track.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                                     track.color === 'green' ? 'bg-green-500 hover:bg-green-600' :
                                     track.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' :
                                     track.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
                                     'bg-indigo-500 hover:bg-indigo-600'
                                   : ''
                               }`}
                             >
                               <span className="font-bold">{track.name}</span>
                               <span className="text-xs opacity-80">{track.description}</span>
                               <span className="text-xs">
                                 ממוצע: {track.averageRate.toFixed(2)}%
                               </span>
                             </Button>
                           ))}
                         </div>
                       </div>
                     </div>
                     <div className="text-sm text-gray-500 mt-2 text-center">
                       <span>בחר מסלול הלוואה לקבלת חישוב מדויק</span>
                     </div>
                   </div>

                  {/* Loan Term */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>תקופת המשכנתא</Label>
                      <span className="text-lg font-bold text-orange-600">
                        {loanTermNum > 0 ? loanTermNum + ' שנים' : 'הזן ערך'}
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={loanTerm}
                      autoComplete="off"
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty value
                        if (value === '') {
                          setLoanTerm('')
                          return
                        }
                        
                        // Allow only digits
                        const cleanValue = value.replace(/[^\d]/g, '')
                        
                        const numValue = parseInt(cleanValue)
                        
                        // Always update the value if it's a valid number
                        if (!isNaN(numValue)) {
                          setLoanTerm(cleanValue)
                        }
                      }}
                      placeholder=""
                      className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-orange-500 placeholder:font-medium ${
                        loanTermNum < 10 || loanTermNum > selectedType.maxTerm ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>10 שנים</span>
                      <span>{selectedType.maxTerm} שנים</span>
                    </div>
                    {(loanTermNum < 10 || loanTermNum > selectedType.maxTerm) && loanTerm && (
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
                      autoComplete="off"
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
                      placeholder=""
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
                      autoComplete="off"
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
                      placeholder=""
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
                          {otherLoansMonthsNum > 0 ? otherLoansMonthsNum + ' חודשים' : 'הזן ערך'}
                        </span>
                      </div>
                                             <Input
                         type="text"
                         value={otherLoansMonths}
                         autoComplete="off"
                         onChange={(e) => {
                           const value = e.target.value
                           // Allow empty value
                           if (value === '') {
                             setOtherLoansMonths('')
                             return
                           }
                           
                           // Allow only digits
                           const cleanValue = value.replace(/[^\d]/g, '')
                           
                           const numValue = parseInt(cleanValue)
                           
                           // Always update the value if it's a valid number
                           if (!isNaN(numValue)) {
                             setOtherLoansMonths(cleanValue)
                           }
                         }}
                         placeholder="60"
                         className={`w-full text-left placeholder:text-gray-500 placeholder:text-base border-2 focus:border-orange-500 placeholder:font-medium ${
                           otherLoansMonthsNum < 1 || otherLoansMonthsNum > 300 ? 'border-red-300' : ''
                         }`}
                       />
                      <div className="text-xs text-gray-500 mt-1">
                        מספר החודשים שנשארו לשלם את ההלוואה
                      </div>
                      {(otherLoansMonthsNum < 1 || otherLoansMonthsNum > 300) && otherLoansMonths && (
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
                    <CardTitle className="flex items-center justify-center space-x-4 space-x-reverse">
                      {/* <DollarSign className="w-5 h-5" /> */}
                      <span>תוצאות החישוב</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      key={`${propertyPriceNum}-${interestRateNum}-${loanTermNum}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">תשלום חודשי</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {hasRequiredFields ? formatCurrency(monthlyPayment) : 'הזן ערכים'}
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">סכום הלוואה</div>
                          <div className="text-2xl font-bold text-green-600">
                            {hasRequiredFields ? formatCurrency(loanAmount) : 'הזן ערכים'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">סך ריביות</div>
                          <div className="text-xl font-bold text-purple-600">
                            {hasRequiredFields ? formatCurrency(totalInterest) : 'הזן ערכים'}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600">יחס החזר</div>
                          <div className="text-xl font-bold text-orange-600">
                            {hasRequiredFields ? debtToIncomeRatio.toFixed(1) + '%' : 'הזן ערכים'}
                          </div>
                        </div>
                      </div>

                      {/* LTV Ratio */}
                      <div className={`p-4 rounded-lg ${isLTVExceeded ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">יחס הלוואה (LTV)</span>
                          <span className={`font-bold ${isLTVExceeded ? 'text-red-600' : 'text-green-600'}`}>
                            {hasRequiredFields ? ltvRatio.toFixed(1) + '%' : 'הזן ערכים'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          מקסימום מותר: {selectedType.maxLTV * 100}%
                        </div>
                        {isLTVExceeded && hasRequiredFields && (
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
                          {hasRequiredFields ? debtToIncomeRatio.toFixed(1) + '%' : 'הזן ערכים'}
                        </span>
                      </div>
                      
                      {hasRequiredFields && (
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
                      )}
                      
                      <div className={`p-3 rounded-lg border ${debtRatioInfo.bgColor} ${debtRatioInfo.borderColor}`}>
                        <div className={`text-sm font-semibold ${debtRatioInfo.color}`}>
                          {debtRatioInfo.message}
                        </div>
                        {otherLoansNum > 0 && hasRequiredFields && (
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