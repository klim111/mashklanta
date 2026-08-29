'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, RefreshCw, TrendingUp, Calculator, Banknote, Clock, Target } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import NavBar from '@/components/ui/navbar';

export default function ExistingMortgagePage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [refinanceOption, setRefinanceOption] = useState<string | null>(null);

  const renderMainOptions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          פעולות על משכנתא קיימת
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          בחר את הפעולה המתאימה לך ונתחיל בתהליך האופטימיזציה של המשכנתא שלך
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Refinance Option */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className="group relative overflow-hidden border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl cursor-pointer min-h-[400px]"
            onClick={() => setSelectedOption('refinance')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <RefreshCw className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                מיחזור משכנתא קיימת
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                תן למשכלנתא לשפר את תנאי המשכנתא הנוכחית שלך
              </p>
              <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700 font-semibold">
                <span>התחל עכשיו</span>
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transfer Option */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className="group relative overflow-hidden border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl cursor-pointer min-h-[400px]"
            onClick={() => setSelectedOption('transfer')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">
                גרירת משכנתא
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                תרכוש נכס חדש ותישאר עם המשכנתא הנוכחית שלך
              </p>
              <div className="flex items-center justify-center text-green-600 group-hover:text-green-700 font-semibold">
                <span>התחל עכשיו</span>
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Back Button */}
      <div className="text-center mt-8">
        <Link href="/">
          <Button
            variant="outline"
            className="px-6 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור לעמוד הבית
          </Button>
        </Link>
      </div>
    </motion.div>
  );

  const renderRefinanceOptions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          מיחזור משכנתא קיימת
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          בחר את המטרה שלך למיחזור המשכנתא ונתחיל בתהליך האופטימיזציה
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Reduce Monthly Payment */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className="group relative overflow-hidden border border-gray-200 hover:border-purple-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl cursor-pointer min-h-[400px]"
            onClick={() => setRefinanceOption('reduce-payment')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Banknote className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                הקטן את התשלום החודשי
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                נסה למצוא תנאים טובים יותר שיפחיתו את ההחזר החודשי שלך
              </p>
              <div className="flex items-center justify-center text-purple-600 group-hover:text-purple-700 font-semibold">
                <span>התחל עכשיו</span>
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Shorten Period */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className="group relative overflow-hidden border border-gray-200 hover:border-orange-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl cursor-pointer min-h-[400px]"
            onClick={() => setRefinanceOption('shorten-period')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors">
                לקצר את תקופת המשכנתא
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                קיצור של תקופת המשכנתא גם מקטין את הסכום הכללי שישולם עד תום תקופת המשכנתא
              </p>
              <div className="flex items-center justify-center text-orange-600 group-hover:text-orange-700 font-semibold">
                <span>התחל עכשיו</span>
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Back Button */}
      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={() => setSelectedOption(null)}
          className="px-6 py-3"
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
          חזור לאפשרויות הראשיות
        </Button>
      </div>
    </motion.div>
  );

  const renderTransferOptions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          גרירת משכנתא
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          העבר את המשכנתא הקיימת שלך לנכס חדש וחסוך עלויות מיותרות
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
          <TrendingUp className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          תהליך גרירת משכנתא
        </h3>
        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          גרירת משכנתא מאפשרת לך להעביר את המשכנתא הקיימת שלך לנכס חדש, 
          תוך שמירה על התנאים הנוכחיים וחיסכון בעלויות של משכנתא חדשה.
        </p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-green-800 mb-3">יתרונות גרירת משכנתא:</h4>
          <ul className="text-green-700 text-right space-y-2">
            <li>• חיסכון בעלויות פתיחה של משכנתא חדשה</li>
            <li>• שמירה על התנאים הנוכחיים של המשכנתא</li>
            <li>• תהליך מהיר יותר מאשר משכנתא חדשה</li>
            <li>• פחות בירוקרטיה ותיעוד נדרש</li>
          </ul>
        </div>

        <Link href="/mortgage-advisor">
          <Button
            size="lg"
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg"
          >
            <Target className="w-5 h-5 ml-2" />
            התחל תהליך גרירת משכנתא
          </Button>
        </Link>
      </div>

      {/* Back Button */}
      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={() => setSelectedOption(null)}
          className="px-6 py-3"
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
          חזור לאפשרויות הראשיות
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Navigation */}
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <NavBar />
      </div>
      
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {!selectedOption && renderMainOptions()}
        {selectedOption === 'refinance' && !refinanceOption && renderRefinanceOptions()}
        {selectedOption === 'transfer' && renderTransferOptions()}
        {refinanceOption && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {refinanceOption === 'reduce-payment' ? 'הקטן את התשלום החודשי' : 'לקצר את תקופת המשכנתא'}
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {refinanceOption === 'reduce-payment' 
                  ? 'נסה למצוא תנאים טובים יותר שיפחיתו את ההחזר החודשי שלך'
                  : 'קיצור של תקופת המשכנתא גם מקטין את הסכום הכללי שישולם עד תום תקופת המשכנתא'
                }
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${
                refinanceOption === 'reduce-payment' ? 'from-purple-600 to-purple-700' : 'from-orange-600 to-orange-700'
              } rounded-2xl flex items-center justify-center shadow-lg`}>
                {refinanceOption === 'reduce-payment' ? (
                  <Banknote className="w-10 h-10 text-white" />
                ) : (
                  <Clock className="w-10 h-10 text-white" />
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {refinanceOption === 'reduce-payment' ? 'מיחזור להקטנת תשלום חודשי' : 'מיחזור לקיצור תקופה'}
              </h3>
              
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                {refinanceOption === 'reduce-payment' 
                  ? 'נסה למצוא ריביות נמוכות יותר ותנאים טובים יותר שיפחיתו את ההחזר החודשי שלך, תוך שמירה על תקופת המשכנתא הנוכחית.'
                  : 'קיצור תקופת המשכנתא יגדיל את ההחזר החודשי אבל יקטין משמעותית את הסכום הכולל שתשלם לאורך כל תקופת המשכנתא.'
                }
              </p>

              <Link href="/mortgage-refinance">
                <Button
                  size="lg"
                  className={`px-8 py-4 ${
                    refinanceOption === 'reduce-payment' 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  } text-white text-lg`}
                >
                  <Target className="w-5 h-5 ml-2" />
                  התחל תהליך מיחזור
                </Button>
              </Link>
            </div>

            {/* Back Button */}
            <div className="text-center mt-8">
              <Button
                variant="outline"
                onClick={() => setRefinanceOption(null)}
                className="px-6 py-3"
              >
                <ArrowLeft className="w-5 h-5 ml-2" />
                חזור לאפשרויות מיחזור
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
