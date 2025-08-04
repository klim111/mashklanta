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
    <section id="stats" className="py-10 px-4 bg-muted">
      <h2 className="text-3xl font-bold text-center mb-8">נתונים וסטטיסטיקות</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="h-64">
            <h3 className="text-lg font-semibold text-center">מגמת מחירי דירות</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={housingPrices}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="h-64">
            <h3 className="text-lg font-semibold text-center">ריביות המשכנתא</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={interestRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="h-64">
            <h3 className="text-lg font-semibold text-center">התפלגות סוגי מסלולים</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={loanDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {loanDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="h-64">
            <h3 className="text-lg font-semibold text-center">אחוז מהכנסה לתשלום משכנתא</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={monthlyMortgage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="income" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="percent" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
} 