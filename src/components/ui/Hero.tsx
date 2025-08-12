"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative text-center py-24 px-4 bg-gradient-to-b from-white to-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-5xl mx-auto"
      >
        <motion.div 
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-full text-sm font-medium mb-8 shadow-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            אתה מחליט לאן – אנחנו יודעים איך
          </span>
        </motion.div>

        <motion.h1 
          className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 text-gray-900 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          המדריך האישי שלך בעולם 
          <span className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">המשכנתאות</span>
        </motion.h1>

        <motion.p
          className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          משכלתנא משלבת ידע פיננסי, אלגוריתמים חכמים ובינה מלאכותית – כדי להוביל אותך בבטחה מההתחלה ועד החתימה על המשכנתא האידיאלית שלך.
        </motion.p>

        <motion.p
          className="text-lg text-gray-700 mb-12 leading-relaxed max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          אתה מגדיר את היעד, ואנחנו בונים את הדרך: ליווי אישי ובטוח עד למשכנתא טובה, זולה, והמתאימה לך ביותר. המערכת שלנו עושה שימוש בכלים אלגוריתמיים ובינה מלאכותית כדי לבחור עבורך את המסלול האופטימלי.
        </motion.p>

        <motion.div 
          className="flex flex-col sm:flex-row gap-6 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button className="px-10 py-4 text-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
            התחל עכשיו
          </Button>
          <Button 
            variant="outline" 
            className="px-10 py-4 text-lg border-2 border-primary-600 text-primary-700 hover:bg-primary-600 hover:text-white font-semibold rounded-xl transition-all duration-300" 
            onClick={() => {
              const el = document.getElementById('features');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            למד עוד
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
} 