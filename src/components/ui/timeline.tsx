"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import clsx from "clsx";

const steps = [
  {
    title: "בחר מטרה",
    content: "אנא בחר את מטרת המשכנתא שלך מתוך הרשימה.",
    form: null,
  },
  {
    title: "פרטים אישיים",
    content: "מלא את פרטיך האישיים לצורך חישוב מותאם.",
    form: () => (
      <form className="space-y-4">
        <label className="block">
          שם מלא:
          <input type="text" className="w-full border p-2 rounded mt-1" />
        </label>
        <label className="block">
          גיל:
          <input type="number" className="w-full border p-2 rounded mt-1" />
        </label>
      </form>
    ),
  },
  {
    title: "העלאת מסמכים",
    content: "העלה את המסמכים הדרושים להמשך תהליך המשכנתא.",
    form: () => (
      <form className="space-y-4">
        <label className="block">
          תעודת זהות:
          <input 
            type="file" 
            accept="image/*,application/pdf"
            className="w-full mt-1" 
            onChange={async (e) => {
              const file = e.target.files && e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const imageData = String(reader.result);
                    
                    const response = await fetch('/api/analyze-image', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ 
                        imageData, 
                        useOpenAI: true 
                      }),
                    });

                    if (response.ok) {
                      const result = await response.json();
                      console.log('ID Document parsed:', result.mortgageTerms);
                      console.log('ID Document text:', result.extractedText);
                      alert(`תעודת זהות נפרסה בהצלחה!\n\nנתונים שנמצאו:\n${JSON.stringify(result.mortgageTerms, null, 2)}\n\nטקסט שנמצא:\n${result.extractedText}`);
                    } else {
                      console.error('Error analyzing ID:', await response.text());
                      alert('שגיאה בניתוח תעודת הזהות. נסה שוב.');
                    }
                  } catch (err) {
                    console.error('שגיאה בעיבוד תעודת הזהות:', err);
                    alert('שגיאה בעיבוד תעודת הזהות. נסה שוב.');
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>
        <label className="block">
          תלושי שכר:
          <input 
            type="file" 
            accept="image/*,application/pdf"
            className="w-full mt-1" 
            onChange={async (e) => {
              const file = e.target.files && e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const imageData = String(reader.result);
                    
                    const response = await fetch('/api/analyze-image', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ 
                        imageData, 
                        useOpenAI: true 
                      }),
                    });

                    if (response.ok) {
                      const result = await response.json();
                      console.log('Salary slip parsed:', result.mortgageTerms);
                      console.log('Salary slip text:', result.extractedText);
                      alert(`תלוש שכר נפרס בהצלחה!\n\nנתונים שנמצאו:\n${JSON.stringify(result.mortgageTerms, null, 2)}\n\nטקסט שנמצא:\n${result.extractedText}`);
                    } else {
                      console.error('Error analyzing salary slip:', await response.text());
                      alert('שגיאה בניתוח תלוש השכר. נסה שוב.');
                    }
                  } catch (err) {
                    console.error('שגיאה בעיבוד תלוש השכר:', err);
                    alert('שגיאה בעיבוד תלוש השכר. נסה שוב.');
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>
      </form>
    ),
  },
];

export default function InteractiveTimeline() {
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (option: string) => {
    setSelectedPurpose(option);
    setDrawerOpen(false);
  };

  return (
    <div dir="rtl" className="relative min-h-screen p-6 bg-muted">
      {/* קו מרכזי */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-full border-r-2 border-gray-300 z-0"></div>

      <div className="relative z-10 space-y-12">
        {steps.map((step, index) => {
          const isRight = index % 2 === 0;

          return (
            <div
              key={index}
              className={`flex justify-${isRight ? "start" : "end"} w-full`}
            >
              <div
                className={`w-full md:w-5/12 p-6 bg-white rounded-xl shadow-lg text-right ${
                  isRight ? "ml-auto" : "mr-auto"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">
                  שלב {index + 1}: {step.title}
                </h3>
                <p className="mb-4">{step.content}</p>

                {/* First Step with Drawer */}
                {index === 0 ? (
                  <div className="relative">
                    <Button
                      className="w-full"
                      onClick={() => setDrawerOpen(!drawerOpen)}
                    >
                      {selectedPurpose || "בחר מטרה"}
                    </Button>

                    {/* Drawer Animation */}
                    <div
                      className={clsx(
                        "transition-all overflow-hidden",
                        drawerOpen ? "max-h-96 mt-4" : "max-h-0"
                      )}
                    >
                      <div className="flex flex-col space-y-2 mt-2 border-t pt-4">
                        {["רכישת דירה", "שיפוץ", "מיחזור", "השקעה", "אחר"].map(
                          (option) => (
                            <Button
                              key={option}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => handleSelect(option)}
                            >
                              {option}
                            </Button>
                          )
                        )}
                      </div>
                      <div className="flex justify-center mt-4">
                        <ChevronUp
                          className="cursor-pointer"
                          onClick={() => setDrawerOpen(false)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  step.form && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>השלם שלב</Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">{step.form()}</DialogContent>
                    </Dialog>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 