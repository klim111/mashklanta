import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import clsx from "clsx"; // make sure you have this installed (`npm i clsx`)

const steps = [
  {
    title: "בחר מטרה",
    content: "אנא בחר את מטרת המשכנתא שלך מתוך הרשימה.",
    form: null, // we'll embed this directly
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
          <input type="file" className="w-full mt-1" />
        </label>
        <label className="block">
          תלושי שכר:
          <input type="file" className="w-full mt-1" />
        </label>
      </form>
    ),
  },
];

export default function InteractiveTimeline() {
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (option) => {
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
