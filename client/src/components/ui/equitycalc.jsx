"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CapitalPlanningCalculator() {
  const [propertyPrice, setPropertyPrice] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [equity, setEquity] = useState("");

  const [expenses, setExpenses] = useState([
    { description: "תיווך", amount: "", date: "" },
    { description: "עו\"ד", amount: "", date: "" },
    { description: "מס רכישה", amount: "", date: "" },
    { description: "מס שבח", amount: "", date: "" },
    { description: "היטל השבחה", amount: "", date: "" },
    { description: "שיפוצים", amount: "", date: "" },
    { description: "רכישות לדירה", amount: "", date: "" },
    { description: "עלויות לקיחת משכנתא", amount: "", date: "" },
  ]);

  const handleAmountChange = (index, value) => {
    const updated = [...expenses];
    updated[index].amount = value;
    setExpenses(updated);
  };

  const handleDateChange = (index, value) => {
    const updated = [...expenses];
    updated[index].date = value;
    setExpenses(updated);
  };

  const totalExpenses = expenses.reduce((sum, exp) => {
    const num = parseFloat(exp.amount);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const numericPrice = parseFloat(propertyPrice) || 0;
  const numericEquity = parseFloat(equity) || 0;

  const getMinEquity = () => {
    let minEquityPercent = 0.5;
    switch (selectedType) {
      case "דירה יחידה":
        minEquityPercent = 0.25;
        break;
      case "דירה חליפית":
        minEquityPercent = 0.30;
        break;
      case "דירה נוספת":
      case "לכל מטרה":
        minEquityPercent = 0.5;
        break;
    }
    return numericPrice * minEquityPercent;
  };

  const minEquity = getMinEquity();
  const availableEquity = Math.max(numericEquity - totalExpenses, 0);
  const ltv = numericPrice > 0 ? ((numericPrice - availableEquity) / numericPrice) * 100 : 0;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center">מחשבון הון עצמי</h1>

      {/* סוג ההלוואה */}
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

      {/* מחיר הנכס + הון עצמי */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block mb-1 text-right">מחיר הנכס</label>
          <Input
            className="text-right"
            placeholder="₪"
            value={propertyPrice}
            type="number"
            onChange={(e) => setPropertyPrice(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-right">הון עצמי</label>
          <Input
            className="text-right"
            placeholder="₪"
            type="number"
            value={equity}
            onChange={(e) => setEquity(e.target.value)}
          />
          {propertyPrice && selectedType && minEquity > 0 && (
            <p className="text-sm mt-1 text-gray-600 text-right">
              הון עצמי מינימלי נדרש:{" "}
              <span className="font-bold text-rose-600">
                {minEquity.toLocaleString("he-IL", {
                  style: "currency",
                  currency: "ILS",
                  maximumFractionDigits: 0,
                })}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* טבלת הוצאות */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-300 text-right">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 p-2">תאריך</th>
              <th className="border border-gray-300 p-2">עלות</th>
              <th className="border border-gray-300 p-2">תיאור</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((row, index) => (
              <tr key={row.description}>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="date"
                    className="text-right"
                    value={row.date}
                    onChange={(e) => handleDateChange(index, e.target.value)}
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    className="text-right"
                    value={row.amount}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                  />
                </td>
                <td className="border border-gray-300 p-2">{row.description}</td>
              </tr>
            ))}
            <tr className="font-bold bg-gray-50">
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2">{totalExpenses.toLocaleString()}</td>
              <td className="border border-gray-300 p-2">סה"כ</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
        <div>
          <label className="block mb-1">הון עצמי פנוי</label>
          <Input
            className="text-right"
            value={availableEquity.toLocaleString()}
            readOnly
          />
        </div>
        <div>
          <label className="block mb-1">אחוז מימון (LTV)</label>
          <Input
            className="text-right"
            value={ltv.toFixed(2) + "%"}
            readOnly
          />
        </div>
        <div>
          <label className="block mb-1">הון עצמי מינימלי</label>
          <Input
            className="text-right"
            value={
              minEquity
                ? minEquity.toLocaleString("he-IL", {
                    style: "currency",
                    currency: "ILS",
                    maximumFractionDigits: 0,
                  })
                : ""
            }
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
