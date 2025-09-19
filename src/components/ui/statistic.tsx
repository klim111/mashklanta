"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Card, CardContent } from "@/components/ui/card";

const housingPrices = [
  { month: "Jan", price: 1900000 },
  { month: "Feb", price: 1930000 },
  { month: "Mar", price: 1950000 },
  { month: "Apr", price: 1970000 },
  { month: "May", price: 1995000 },
  { month: "Jun", price: 2000000 },
];

const interestRates = [
  { month: "Jan", rate: 3.1 },
  { month: "Feb", rate: 3.2 },
  { month: "Mar", rate: 3.4 },
  { month: "Apr", rate: 3.6 },
  { month: "May", rate: 3.5 },
  { month: "Jun", rate: 3.3 },
];

const loanDistribution = [
  { name: "פריים", value: 40 }, 
  { name: "קלצ", value: 35 },
  { name: "משתנה כל 5 שנים", value: 25 },
];

const monthlyMortgage = [
  { income: "Low", percent: 45 },
  { income: "Mid", percent: 30 },
  { income: "High", percent: 20 },
];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658"];

export default function Statistic() {
  return (
    <section id="stats" className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
          נתונים וסטטיסטיקות
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="h-80 p-6">
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-4">מגמת מחירי דירות</h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={housingPrices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="h-80 p-6">
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-4">ריביות המשכנתא</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={interestRates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="rate" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="h-80 p-6">
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-4">התפלגות סוגי מסלולים</h3>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={loanDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#2563eb"
                    label
                  >
                    {loanDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#2563eb', '#059669', '#7c3aed'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="h-80 p-6">
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-4">אחוז מהכנסה לתשלום משכנתא</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={monthlyMortgage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="income" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="percent" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
} 