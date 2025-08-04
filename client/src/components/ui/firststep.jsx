import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

const mortgageOptions = [
  "ייעוץ ראשוני מקיף",
  "רכישת דירה יד שנייה",
  "רכישת דירה מקבלן",
  "הקטנת החזר חודשי",
  "הקטנת הסכום הכולל",
  "מיחזור ואיחוד הלוואות",
  "משכנתא לכל מטרה",
];

export default function FirstStep() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (option) => {
    setSelectedOption(option);
    setDrawerOpen(false);
  };

  return (
    <div dir="rtl" className="min-h-screen p-6 bg-muted flex flex-col items-center">
      {/* קו מרכזי אנכי */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-full border-r-2 border-gray-300 z-0"></div>

      {/* שלב 1 */}
      <div className="w-full md:w-6/12 p-6 bg-white rounded-xl shadow-lg text-right z-10 relative">
        <h3 className="text-xl font-bold mb-2">שלב 1: אני מעוניין ב...</h3>
        <p className="mb-4 text-muted-foreground">
          {selectedOption ? selectedOption : "בחר את מטרת המשכנתא שלך"}
        </p>
        <Button onClick={() => setDrawerOpen(!drawerOpen)}>
          {selectedOption ? "שנה בחירה" : "בחר"}
        </Button>

        {/* מגירה נפתחת */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              key="drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-4"
            >
              <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-lg border">
                {mortgageOptions.map((option) => (
                  <Button
                    key={option}
                    variant="outline"
                    onClick={() => handleSelect(option)}
                    className="justify-start"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
