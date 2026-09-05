'use client';



import { motion } from 'framer-motion';

import { ArrowLeft, ArrowRight, User, Users, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';



interface BorrowerTypeSelectionProps {

  onSelect: (type: 'individual' | 'couple') => void;

  onBack: () => void;

}



export function BorrowerTypeSelection({ onSelect, onBack }: BorrowerTypeSelectionProps) {

  return (

    <motion.div

      initial={{ opacity: 0, y: 20 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.6 }}

      className="max-w-4xl mx-auto"

    >

      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">מי לוקח את המשכנתא?</h2>
        <p className="text-lg text-gray-600">בחרו את סוג הבקשה כדי שנתאים את החישוב והמסכים</p>
      </div>



      <TooltipProvider>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">

          <motion.div

            whileHover={{ scale: 1.02, y: -5 }}

            whileTap={{ scale: 0.98 }}

            className="group cursor-pointer"

            onClick={() => onSelect('individual')}

          >

            <Card className="h-full border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white shadow-lg hover:shadow-xl min-h-[320px]">

              <CardContent className="p-8 text-center h-full flex flex-col justify-between">

                <div>

                  <motion.div layout className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">

                    <User className="w-10 h-10 text-white" />

                  </motion.div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">

                    משכנתא ליחיד

                  </h3>

                  <p className="text-gray-600 text-lg leading-relaxed">הזנת פרטים אישיים עבור לווה יחיד</p>

                </div>

                <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700 font-semibold">

                  <span>המשך</span>

                  <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />

                </div>

              </CardContent>

            </Card>

          </motion.div>



          <motion.div

            whileHover={{ scale: 1.02, y: -5 }}

            whileTap={{ scale: 0.98 }}

            className="group cursor-pointer"

            onClick={() => onSelect('couple')}

          >

            <Card className="h-full border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white shadow-lg hover:shadow-xl min-h-[320px]">

              <CardContent className="p-8 text-center h-full flex flex-col justify-between">

                <div>

                  <motion.div layout className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">

                    <Users className="w-10 h-10 text-white" />

                  </motion.div>

                  <div className="flex items-center justify-center gap-2 mb-4">

                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">

                      אנחנו זוג שלוקח משכנתא

                    </h3>

                    <Tooltip>

                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>

                        <button

                          type="button"

                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"

                          aria-label="מידע על משכנתא לזוג"

                        >

                          <Info className="w-4 h-4" />

                        </button>

                      </TooltipTrigger>

                      <TooltipContent side="top" className="max-w-xs text-right p-3">

                        <p>

                          משכנתא לזוג משתלמת יותר — הבנקים, לאור פיזור הסיכון, נותנים לרוב ריביות אטרקטיביות יותר לזוגות מאשר ליחידים.

                        </p>

                      </TooltipContent>

                    </Tooltip>

                  </div>

                  <p className="text-gray-600 text-lg leading-relaxed">

                    הזנת נתונים לשני הלווים וחישוב משוקלל של יכולת ההחזר

                  </p>

                </div>

                <motion.div layout className="flex items-center justify-center text-green-600 group-hover:text-green-700 font-semibold">

                  <span>המשך</span>

                  <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />

                </motion.div>

              </CardContent>

            </Card>

          </motion.div>

        </div>

      </TooltipProvider>



      <div className="text-center mt-8">

        <Button variant="outline" onClick={onBack} className="px-6 py-3">

          <ArrowRight className="w-5 h-5 mr-2" />

          חזור

        </Button>

      </div>

    </motion.div>

  );

}


