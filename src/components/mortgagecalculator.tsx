"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PaymentSchedule {
  month: number;
  principal: number;
  interest: number;
  total: number;
  balance: number;
}

export default function MortgageCalculator() {
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTermYears, setLoanTermYears] = useState('');
  const [schedule, setSchedule] = useState<PaymentSchedule[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [totalPayment, setTotalPayment] = useState(0);
  const [repaymentPerShekel, setRepaymentPerShekel] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [selectedType, setSelectedType] = useState("");

  useEffect(() => {
    const principal = parseFloat(loanAmount);
    const annualInterestRate = parseFloat(interestRate) / 100;
    const numberOfPayments = parseInt(loanTermYears) * 12;
    const monthlyInterestRate = annualInterestRate / 12;

    if (!principal || !annualInterestRate || !numberOfPayments) {
      setMonthlyPayment(0);
      return;
    }

    const payment =
      (principal *
        monthlyInterestRate *
        Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    setMonthlyPayment(payment);
  }, [loanAmount, interestRate, loanTermYears]);

  const calculateSchedule = () => {
    const principal = parseFloat(loanAmount);
    const annualInterestRate = parseFloat(interestRate) / 100;
    const numberOfPayments = parseInt(loanTermYears) * 12;
    const monthlyInterestRate = annualInterestRate / 12;

    const monthlyPayment =
      (principal *
        monthlyInterestRate *
        Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    const scheduleArr: PaymentSchedule[] = [];
    let balance = principal;

    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = balance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;

      scheduleArr.push({
        month: i,
        principal: principalPayment,
        interest: interestPayment,
        total: monthlyPayment,
        balance: Math.max(balance, 0),
      });
    }

    const total = monthlyPayment * numberOfPayments;
    setTotalPayment(total);
    setRepaymentPerShekel(total / principal);
    setSchedule(scheduleArr);
    setShowSchedule(true);
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center">מחשבון משכנתא - לוח שפיצר</h1>
      <div className="flex justify-center flex-wrap gap-2">
        {["דירה יחידה", "דירה חליפית", "דירה נוספת", "לכל מטרה"].map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? "default" : "outline"}
            onClick={() => setSelectedType(type)}
          >
            {type}
          </Button>
        ))}
      </div>
      <div className="flex flex-row-reverse gap-3">
        <div className="w-full md:w-1/3">
          <label className="block mb-1 text-right">סכום הלוואה</label>
          <Input
            className="text-right"
            type="text"
            value={Number(loanAmount).toLocaleString()}
            placeholder="₪"
            onChange={(e) => {
              const rawValue = e.target.value.replace(/,/g, '');
              if (!isNaN(Number(rawValue))) {
                setLoanAmount(rawValue);
              }
            }}
          />
        </div>
        <div className="w-full md:w-1/3">
          <label className="block mb-1 text-right">ריבית שנתית (%)</label>
          <Input
            className="text-right"
            type="number"
            value={interestRate}
            placeholder="%"
            onChange={(e) => setInterestRate(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/3">
          <label className="block mb-1 text-right">משך הלוואה (שנים)</label>
          <Input
            className="text-right"
            type="number"
            value={loanTermYears}
            placeholder="שנים"
            onChange={(e) => setLoanTermYears(e.target.value)}
          />
        </div>
      </div>

      {/* תשלום חודשי משוער */}
      {monthlyPayment > 0 && (
        <div className="mb-4 text-center">
          <p className="text-lg">
            <span className="font-semibold">תשלום חודשי משוער:</span>{' '}
            {monthlyPayment.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            ₪
          </p>
        </div>
      )}

      {!showSchedule && (
        <button
          onClick={calculateSchedule}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          הצג לוח סילוקין
        </button>
      )}

      <AnimatePresence>
        {showSchedule && (
          <motion.div
            initial={{ opacity: 0, y: -200 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.4 }}
            className="mt-6 bg-gray-100 p-4 rounded-lg shadow-md"
          >
            <h2 className="text-xl font-semibold mb-2">לוח סילוקין</h2>
            <div className="overflow-auto max-h-[400px] border rounded">
              <table className="table-auto w-full text-sm">
                <thead>
                  <tr className="bg-gray-300">
                    <th className="px-2 py-1">חודש</th>
                    <th className="px-2 py-1">קרן</th>
                    <th className="px-2 py-1">ריבית</th>
                    <th className="px-2 py-1">סה"כ תשלום</th>
                    <th className="px-2 py-1">יתרה</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((payment, index) => (
                    <tr key={index} className="even:bg-white odd:bg-gray-200">
                      <td className="px-2 py-1">{payment.month}</td>
                      <td className="px-2 py-1">
                        {payment.principal.toFixed(2)}
                      </td>
                      <td className="px-2 py-1">
                        {payment.interest.toFixed(2)}
                      </td>
                      <td className="px-2 py-1">{payment.total.toFixed(2)}</td>
                      <td className="px-2 py-1">{payment.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-right space-y-1">
              <div>
                <strong>סה"כ החזר:</strong>{' '}
                {totalPayment.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{' '}
                ₪
              </div>
              <div>
                <strong>החזר לשקל:</strong>{' '}
                {repaymentPerShekel.toFixed(3)} ₪
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSchedule(false)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              >
                סגור לוח סילוקין
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 