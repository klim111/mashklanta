"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { 
  Calculator, 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  ArrowRight,
  Home,
  DollarSign,
  Clock,
  Users,
  Building
} from "lucide-react"

const demoSteps = [
  {
    id: 1,
    title: "הזנת פרטים בסיסיים",
    description: "הזן את פרטי המשכנתא שלך",
    icon: <Calculator className="w-6 h-6" />,
    content: {
      type: "form",
      fields: [
        { label: "סכום המשכנתא", value: "₪1,200,000", type: "amount" },
        { label: "תקופת המשכנתא", value: "30 שנים", type: "period" },
        { label: "הכנסה חודשית", value: "₪15,000", type: "income" },
        { label: "הון עצמי", value: "₪300,000", type: "equity" }
      ]
    }
  },
  {
    id: 2,
    title: "ניתוח הנתונים",
    description: "המערכת מנתחת את הנתונים שלך",
    icon: <TrendingUp className="w-6 h-6" />,
    content: {
      type: "analysis",
      results: [
        { label: "יחס החזר", value: "35%", status: "good" },
        { label: "יכולת החזר", value: "מעולה", status: "excellent" },
        { label: "סיכון", value: "נמוך", status: "good" },
        { label: "ציון כללי", value: "9.2/10", status: "excellent" }
      ]
    }
  },
  {
    id: 3,
    title: "בניית תמהיל אופטימלי",
    description: "המערכת בונה תמהיל מותאם אישית",
    icon: <Building className="w-6 h-6" />,
    content: {
      type: "portfolio",
      portfolio: [
        { name: "פריים", percentage: 40, amount: "₪480,000", rate: "3.75%" },
        { name: "משתנה צמודה", percentage: 30, amount: "₪360,000", rate: "4.2%" },
        { name: "קבועה לא צמודה", percentage: 20, amount: "₪240,000", rate: "4.8%" },
        { name: "קבועה צמודה", percentage: 10, amount: "₪120,000", rate: "5.1%" }
      ]
    }
  },
  {
    id: 4,
    title: "השוואת הצעות",
    description: "המערכת משווה הצעות מכל הבנקים",
    icon: <FileText className="w-6 h-6" />,
    content: {
      type: "comparison",
      banks: [
        { name: "בנק הפועלים", totalCost: "₪2,450,000", monthlyPayment: "₪6,800", savings: "₪180,000" },
        { name: "בנק לאומי", totalCost: "₪2,520,000", monthlyPayment: "₪7,000", savings: "₪110,000" },
        { name: "בנק דיסקונט", totalCost: "₪2,380,000", monthlyPayment: "₪6,600", savings: "₪250,000" }
      ]
    }
  },
  {
    id: 5,
    title: "הכנת מסמכים",
    description: "המערכת מכינה את כל המסמכים הנדרשים",
    icon: <CheckCircle className="w-6 h-6" />,
    content: {
      type: "documents",
      documents: [
        "טופס בקשה למשכנתא",
        "אישור הכנסות",
        "תלושי משכורת 3 חודשים אחרונים",
        "אישור חשבון בנק",
        "אישור הון עצמי",
        "תעודת זהות + תעודת נישואין"
      ]
    }
  }
]

export default function Demo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const startDemo = () => {
    setIsPlaying(true)
    setCurrentStep(0)
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= demoSteps.length - 1) {
          clearInterval(interval)
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 3000)
  }

  const resetDemo = () => {
    setIsPlaying(false)
    setCurrentStep(0)
  }

  const renderStepContent = (step: any) => {
    switch (step.content.type) {
      case "form":
        return (
          <div className="grid grid-cols-2 gap-4">
            {step.content.fields.map((field: any, index: number) => (
              <div key={index} className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">{field.label}</div>
                <div className="font-semibold text-blue-800">{field.value}</div>
              </div>
            ))}
          </div>
        )
      
      case "analysis":
        return (
          <div className="grid grid-cols-2 gap-4">
            {step.content.results.map((result: any, index: number) => (
              <div key={index} className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">{result.label}</div>
                <div className={`font-semibold ${
                  result.status === 'excellent' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  {result.value}
                </div>
              </div>
            ))}
          </div>
        )
      
      case "portfolio":
        return (
          <div className="space-y-3">
            {step.content.portfolio.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.rate}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{item.amount}</div>
                  <div className="text-sm text-gray-600">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        )
      
      case "comparison":
        return (
          <div className="space-y-3">
            {step.content.banks.map((bank: any, index: number) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="font-semibold mb-2">{bank.name}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-gray-600">תשלום חודשי</div>
                    <div className="font-semibold">{bank.monthlyPayment}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">עלות כוללת</div>
                    <div className="font-semibold">{bank.totalCost}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">חיסכון</div>
                    <div className="font-semibold text-green-600">{bank.savings}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      
      case "documents":
        return (
          <div className="space-y-2">
            {step.content.documents.map((doc: string, index: number) => (
              <div key={index} className="flex items-center space-x-2 space-x-reverse bg-green-50 p-2 rounded">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">{doc}</span>
              </div>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <section id="demo-section" className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">איך המערכת עובדת?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            צפה בדמו אינטראקטיבי של תהליך המשכנתא החכם שלנו
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Steps */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">תהליך המשכנתא</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoSteps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: currentStep >= index ? 1 : 0.5,
                        x: currentStep >= index ? 0 : -20
                      }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg transition-all ${
                        currentStep === index 
                          ? 'bg-blue-100 border-2 border-blue-300' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        currentStep > index 
                          ? 'bg-green-500 text-white' 
                          : currentStep === index 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                      }`}>
                        {currentStep > index ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-bold">{step.id}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{step.title}</div>
                        <div className="text-sm text-gray-600">{step.description}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demo Content */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>הדמו</CardTitle>
                  <div className="flex space-x-2 space-x-reverse">
                    {!isPlaying ? (
                      <Button onClick={startDemo} className="bg-blue-600 hover:bg-blue-700">
                        התחל דמו
                      </Button>
                    ) : (
                      <Button onClick={resetDemo} variant="outline">
                        איפוס
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="min-h-[300px]"
                  >
                    {currentStep < demoSteps.length && (
                      <div>
                        <div className="flex items-center space-x-3 space-x-reverse mb-6">
                          {demoSteps[currentStep].icon}
                          <div>
                            <h3 className="text-xl font-semibold">
                              {demoSteps[currentStep].title}
                            </h3>
                            <p className="text-gray-600">
                              {demoSteps[currentStep].description}
                            </p>
                          </div>
                        </div>
                        {renderStepContent(demoSteps[currentStep])}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">5 דקות</div>
            <div className="text-gray-600">זמן ממוצע לתהליך</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">₪180K</div>
            <div className="text-gray-600">חיסכון ממוצע</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
            <div className="text-gray-600">דיוק בהמלצות</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
            <div className="text-gray-600">זמינות המערכת</div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 