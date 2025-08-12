"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative text-center py-20 px-4 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
          <span>אתה מחליט לאן – אנחנו יודעים איך</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
          המדריך האישי שלך בעולם המשכנתאות
        </h1>

        <motion.p
          className="text-xl text-gray-600 mb-6 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          משכלתנא משלבת ידע פיננסי, אלגוריתמים חכמים ובינה מלאכותית – כדי להוביל אותך בבטחה מההתחלה ועד החתימה על המשכנתא האידיאלית שלך.
        </motion.p>

        <motion.p
          className="text-lg text-gray-700 mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          אתה מגדיר את היעד, ואנחנו בונים את הדרך: ליווי אישי ובטוח עד למשכנתא טובה, זולה, והמתאימה לך ביותר. המערכת שלנו עושה שימוש בכלים אלגוריתמיים ובינה מלאכותית כדי לבחור עבורך את המסלול האופטימלי.
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="px-8 py-6 text-lg">התחל עכשיו</Button>
          <Button variant="outline" className="px-8 py-6 text-lg" onClick={() => {
            const el = document.getElementById('features');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}>למד עוד</Button>
        </div>
      </motion.div>
    </section>
  );
} 