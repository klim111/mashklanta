'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Upload, FileText, Calculator, Target, RefreshCw, Plus, Trash2, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NavBar from '@/components/ui/navbar';
import { MortgageMixCard } from '@/components/mortgage-advisor/MortgageMixCard';
import { MortgageDetailsModal } from '@/components/mortgage-advisor/MortgageDetailsModal';
import { ScenarioAnalysis } from '@/components/mortgage-advisor/ScenarioAnalysis';

interface MortgageTrack {
  id: string;
  bankName: string;
  trackType: 'prime' | 'variable' | 'fixed' | 'indexLinked';
  amount: number;
  remainingAmount: number;
  interestRate: number;
  remainingPeriod: number;
  monthlyPayment: number;
}

interface RefinanceData {
  currentTracks: MortgageTrack[];
  refinanceGoal: 'reduce-payment' | 'shorten-period';
  bankName: string;
}

export default function MortgageRefinancePage() {
  const [refinanceData, setRefinanceData] = useState<RefinanceData>({
    currentTracks: [],
    refinanceGoal: 'reduce-payment',
    bankName: ''
  });
  const [inputMethod, setInputMethod] = useState<'scan' | 'manual' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MortgageTrack | null>(null);
  
  // Form state for new track
  const [newTrack, setNewTrack] = useState<Partial<MortgageTrack>>({
    trackType: 'prime',
    remainingAmount: 0,
    interestRate: 0,
    remainingPeriod: 0,
    monthlyPayment: 0
  });
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [showScenarioAnalysis, setShowScenarioAnalysis] = useState<any>(null);
  
  // Edit states
  const [isEditingMix, setIsEditingMix] = useState(false);
  const [editingMixData, setEditingMixData] = useState({
    totalAmount: 0,
    averagePeriod: 0
  });

  // Calculate monthly payment function
  const calculateMonthlyPayment = (amount: number, rate: number, period: number): number => {
    if (amount === 0 || rate === 0 || period === 0) return 0;
    const monthlyRate = rate / 100 / 12;
    const numPayments = period * 12;
    return (amount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  };

  // Edit mix functions
  const startEditingMix = () => {
    const totalAmount = refinanceData.currentTracks.reduce((sum, track) => sum + track.remainingAmount, 0);
    const averagePeriod = refinanceData.currentTracks.reduce((sum, track) => sum + track.remainingPeriod, 0) / refinanceData.currentTracks.length;
    setEditingMixData({ totalAmount, averagePeriod });
    setIsEditingMix(true);
  };

  const saveMixEdit = () => {
    // If total amount changed, clear all tracks
    if (editingMixData.totalAmount !== refinanceData.currentTracks.reduce((sum, track) => sum + track.remainingAmount, 0)) {
      setRefinanceData(prev => ({
        ...prev,
        currentTracks: []
      }));
    }
    setIsEditingMix(false);
  };

  const cancelMixEdit = () => {
    setIsEditingMix(false);
  };

  // Edit track functions
  const startEditingTrack = (track: MortgageTrack) => {
    setEditingTrack(track);
    setIsEditing(true);
  };

  const deleteTrack = (trackId: string) => {
    setRefinanceData(prev => ({
      ...prev,
      currentTracks: prev.currentTracks.filter(t => t.id !== trackId)
    }));
  };

  const renderInputMethodSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          מיחזור משכנתא קיימת
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          בחר את הדרך להזנת נתוני המשכנתא הנוכחית שלך
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Scan Option */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className="group relative overflow-hidden border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl cursor-pointer min-h-[400px]"
            onClick={() => setInputMethod('scan')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                סריקת דוח יתרות לסילוק
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                העלה את דוח היתרות לסילוק של המשכנתא הנוכחית שלך ונתחיל את התהליך
              </p>
              <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700 font-semibold">
                <span>התחל עכשיו</span>
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Manual Input Option */}
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card 
            className="group relative overflow-hidden border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl cursor-pointer min-h-[400px]"
            onClick={() => setInputMethod('manual')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">
                הזנה ידנית
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                הזן את פרטי המשכנתא הנוכחית שלך ידנית ונתחיל את התהליך
              </p>
              <div className="flex items-center justify-center text-green-600 group-hover:text-green-700 font-semibold">
                <span>התחל עכשיו</span>
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Back Button */}
      <div className="text-center mt-8">
        <Link href="/existing-mortgage">
          <Button
            variant="outline"
            className="px-6 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור לאפשרויות הראשיות
          </Button>
        </Link>
      </div>
    </motion.div>
  );

  const renderScanUpload = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          העלאת דוח יתרות לסילוק
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          העלה את דוח היתרות לסילוק של המשכנתא הנוכחית שלך
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
          <Upload className="w-10 h-10 text-white" />
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">גרור ושחרר את הקובץ כאן או לחץ לבחירה</p>
          <Button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white">
            בחר קובץ
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-blue-800 mb-3">פורמטים נתמכים:</h4>
          <ul className="text-blue-700 text-right space-y-2">
            <li>• PDF - דוח יתרות לסילוק</li>
            <li>• JPG/PNG - תמונה של הדוח</li>
            <li>• Excel - קובץ נתונים</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => setInputMethod(null)}
            className="px-6 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
          <Button
            onClick={() => {
              // Here you would process the uploaded file
              alert('קובץ הועלה בהצלחה!');
            }}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Target className="w-5 h-5 ml-2" />
            המשך לתהליך
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderManualInput = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-6xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          הזנת פרטי המשכנתא הנוכחית
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          הזן את פרטי המשכנתא הנוכחית שלך כדי לחשב את האפשרויות למיחזור
        </p>
      </div>

      {/* Bank Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Calculator className="w-5 h-5" />
              בחר את הבנק של המשכנתא הנוכחית
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md mx-auto">
              <Label htmlFor="bankName">שם הבנק</Label>
              <Input
                id="bankName"
                placeholder="הזן שם בנק"
                value={refinanceData.bankName}
                onChange={(e) => {
                  setRefinanceData(prev => ({ ...prev, bankName: e.target.value }));
                }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Mortgage Mix Display */}
      {refinanceData.currentTracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <MortgageMixCard
            mix={{
              id: 'current-mix',
              name: `התמהיל הנוכחי - ${refinanceData.bankName}`,
              totalAmount: refinanceData.currentTracks.reduce((sum, track) => sum + track.remainingAmount, 0),
              tracks: refinanceData.currentTracks.map(track => {
                // Map local track types to advisor track types
                const mapTrackType = (localType: string) => {
                  switch (localType) {
                    case 'prime': return 'prime';
                    case 'variable': return 'variable_unlinked';
                    case 'fixed': return 'fixed_unlinked';
                    case 'indexLinked': return 'fixed_linked';
                    default: return 'prime';
                  }
                };

                return {
                  id: track.id,
                  name: `${track.trackType === 'prime' ? 'פריים' :
                         track.trackType === 'variable' ? 'משתנה' :
                         track.trackType === 'fixed' ? 'קבועה' : 'צמודה למדד'}`,
                  type: mapTrackType(track.trackType),
                  amount: track.remainingAmount,
                  percentage: (track.remainingAmount / refinanceData.currentTracks.reduce((sum, t) => sum + t.remainingAmount, 0)) * 100,
                  interestRate: track.interestRate,
                  years: track.remainingPeriod,
                  monthlyPayment: track.monthlyPayment,
                  totalInterest: 0,
                  totalPaid: 0
                };
              }),
              createdAt: new Date(),
              notes: '',
              totalMonthlyPayment: refinanceData.currentTracks.reduce((sum, track) => sum + track.monthlyPayment, 0),
              totalInterest: 0,
              totalPaid: 0,
              averageRate: refinanceData.currentTracks.reduce((sum, track) => sum + track.interestRate, 0) / refinanceData.currentTracks.length
            }}
            onUpdate={(mix) => {
              // Handle update action - start editing the mix
              startEditingMix();
            }}
            onDelete={(mixId) => {
              // Handle delete action - clear all tracks (like in advisor tool)
              setRefinanceData(prev => ({
                ...prev,
                currentTracks: []
              }));
            }}
            onDuplicate={(mix) => {
              // Handle duplicate action - create a copy of the current tracks (like in advisor tool)
              const duplicatedTracks = refinanceData.currentTracks.map(track => ({
                ...track,
                id: `${track.id}-copy-${Date.now()}`
              }));
              setRefinanceData(prev => ({
                ...prev,
                currentTracks: [...prev.currentTracks, ...duplicatedTracks]
              }));
            }}
            onShowDetails={(mix) => {
              // Handle show details action - show detailed breakdown (like in advisor tool)
              setShowDetailsModal(mix);
            }}
            onAnalyzeScenarios={(mix) => {
              // Handle analyze scenarios action - show scenario analysis (like in advisor tool)
              // Create a proper MortgageMix object for ScenarioAnalysis
              const scenarioMix = {
                id: mix.id,
                name: mix.name,
                totalAmount: mix.totalAmount,
                tracks: mix.tracks,
                createdAt: mix.createdAt,
                notes: mix.notes,
                totalMonthlyPayment: mix.totalMonthlyPayment,
                totalInterest: mix.totalInterest,
                totalPaid: mix.totalPaid,
                averageRate: mix.averageRate
              };
              setShowScenarioAnalysis(scenarioMix);
            }}
            onToggleSelect={(mixId) => {
              // Handle toggle select action - for comparison purposes (like in advisor tool)
              console.log('Toggle select:', mixId);
            }}
            isSelected={false}
          />
        </motion.div>
      )}

      {/* Tracks List with Edit/Delete Buttons */}
      {refinanceData.currentTracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                מסלולי המשכנתא
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {refinanceData.currentTracks.map((track) => (
                  <div key={track.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${
                          track.trackType === 'prime' ? 'bg-orange-500' :
                          track.trackType === 'variable' ? 'bg-green-500' :
                          track.trackType === 'fixed' ? 'bg-blue-500' :
                          'bg-purple-500'
                        }`} />
                        <span className="font-medium">
                          {track.trackType === 'prime' ? 'פריים' :
                           track.trackType === 'variable' ? 'משתנה' :
                           track.trackType === 'fixed' ? 'קבועה' : 'צמודה למדד'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        ₪{track.remainingAmount.toLocaleString()} • {track.interestRate}% • {track.remainingPeriod} שנים
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditingTrack(track)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTrack(track.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Mix Modal */}
      {isEditingMix && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold mb-4">עריכת התמהיל</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="totalAmount">סכום המשכנתא הכולל</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={editingMixData.totalAmount}
                  onChange={(e) => setEditingMixData(prev => ({
                    ...prev,
                    totalAmount: Number(e.target.value)
                  }))}
                  placeholder="הזן סכום"
                />
              </div>
              
              <div>
                <Label htmlFor="averagePeriod">תקופה ממוצעת (שנים)</Label>
                <Input
                  id="averagePeriod"
                  type="number"
                  value={editingMixData.averagePeriod}
                  onChange={(e) => setEditingMixData(prev => ({
                    ...prev,
                    averagePeriod: Number(e.target.value)
                  }))}
                  placeholder="הזן תקופה"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={saveMixEdit} className="flex-1">
                שמור
              </Button>
              <Button variant="outline" onClick={cancelMixEdit} className="flex-1">
                ביטול
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Track Modal */}
      {isEditing && editingTrack && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold mb-4">עריכת מסלול</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="trackType">סוג הריבית</Label>
                <Select
                  value={editingTrack.trackType}
                  onValueChange={(value: 'prime' | 'variable' | 'fixed' | 'indexLinked') => 
                    setEditingTrack(prev => prev ? { ...prev, trackType: value } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prime">פריים</SelectItem>
                    <SelectItem value="variable">משתנה</SelectItem>
                    <SelectItem value="fixed">קבועה</SelectItem>
                    <SelectItem value="indexLinked">צמודה למדד</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="remainingAmount">סכום נותר</Label>
                <Input
                  id="remainingAmount"
                  type="number"
                  value={editingTrack.remainingAmount}
                  onChange={(e) => {
                    const amount = Number(e.target.value);
                    const monthlyPayment = calculateMonthlyPayment(amount, editingTrack.interestRate, editingTrack.remainingPeriod);
                    setEditingTrack(prev => prev ? { ...prev, remainingAmount: amount, monthlyPayment } : null);
                  }}
                  placeholder="הזן סכום"
                />
              </div>
              
              <div>
                <Label htmlFor="interestRate">ריבית (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  value={editingTrack.interestRate}
                  onChange={(e) => {
                    const rate = Number(e.target.value);
                    const monthlyPayment = calculateMonthlyPayment(editingTrack.remainingAmount, rate, editingTrack.remainingPeriod);
                    setEditingTrack(prev => prev ? { ...prev, interestRate: rate, monthlyPayment } : null);
                  }}
                  placeholder="הזן ריבית"
                />
              </div>
              
              <div>
                <Label htmlFor="remainingPeriod">תקופה נותרת (שנים)</Label>
                <Input
                  id="remainingPeriod"
                  type="number"
                  value={editingTrack.remainingPeriod}
                  onChange={(e) => {
                    const period = Number(e.target.value);
                    const monthlyPayment = calculateMonthlyPayment(editingTrack.remainingAmount, editingTrack.interestRate, period);
                    setEditingTrack(prev => prev ? { ...prev, remainingPeriod: period, monthlyPayment } : null);
                  }}
                  placeholder="הזן תקופה"
                />
              </div>
              
              {editingTrack.monthlyPayment > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">
                    תשלום חודשי מחושב: ₪{editingTrack.monthlyPayment.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={() => {
                  if (editingTrack) {
                    setRefinanceData(prev => ({
                      ...prev,
                      currentTracks: prev.currentTracks.map(t => 
                        t.id === editingTrack.id ? editingTrack : t
                      )
                    }));
                    setIsEditing(false);
                    setEditingTrack(null);
                  }
                }} 
                className="flex-1"
              >
                שמור
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setEditingTrack(null);
                }} 
                className="flex-1"
              >
                ביטול
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Add New Track Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {refinanceData.currentTracks.length === 0 ? 'הוסף מסלול משכנתא' : 'הוסף מסלול נוסף'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="trackType">סוג מסלול</Label>
                <Select
                  value={isEditing ? (editingTrack?.trackType || '') : (newTrack.trackType || '')}
                  onValueChange={(value) => {
                    if (isEditing && editingTrack) {
                      setEditingTrack(prev => prev ? { ...prev, trackType: value as any } : null);
                    } else {
                      setNewTrack(prev => ({ ...prev, trackType: value as any }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג מסלול" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prime">פריים</SelectItem>
                    <SelectItem value="variable">משתנה</SelectItem>
                    <SelectItem value="fixed">קבועה</SelectItem>
                    <SelectItem value="indexLinked">צמודה למדד</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="remainingAmount">יתרה נוכחית</Label>
                <Input
                  id="remainingAmount"
                  type="number"
                  placeholder="הזן יתרה"
                  value={isEditing ? (editingTrack?.remainingAmount || '') : (newTrack.remainingAmount || '')}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    const rate = isEditing ? (editingTrack?.interestRate || 0) : (newTrack.interestRate || 0);
                    const period = isEditing ? (editingTrack?.remainingPeriod || 0) : (newTrack.remainingPeriod || 0);
                    const monthlyPayment = calculateMonthlyPayment(amount, rate, period);
                    
                    if (isEditing && editingTrack) {
                      setEditingTrack(prev => prev ? { 
                        ...prev, 
                        remainingAmount: amount,
                        monthlyPayment: monthlyPayment
                      } : null);
                    } else {
                      setNewTrack(prev => ({ 
                        ...prev, 
                        remainingAmount: amount,
                        monthlyPayment: monthlyPayment
                      }));
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="interestRate">ריבית נוכחית (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  placeholder="הזן ריבית"
                  value={isEditing ? (editingTrack?.interestRate || '') : (newTrack.interestRate || '')}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value) || 0;
                    const amount = isEditing ? (editingTrack?.remainingAmount || 0) : (newTrack.remainingAmount || 0);
                    const period = isEditing ? (editingTrack?.remainingPeriod || 0) : (newTrack.remainingPeriod || 0);
                    const monthlyPayment = calculateMonthlyPayment(amount, rate, period);
                    
                    if (isEditing && editingTrack) {
                      setEditingTrack(prev => prev ? { 
                        ...prev, 
                        interestRate: rate,
                        monthlyPayment: monthlyPayment
                      } : null);
                    } else {
                      setNewTrack(prev => ({ 
                        ...prev, 
                        interestRate: rate,
                        monthlyPayment: monthlyPayment
                      }));
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="remainingPeriod">תקופה נותרת (שנים)</Label>
                <Input
                  id="remainingPeriod"
                  type="number"
                  placeholder="הזן תקופה"
                  value={isEditing ? (editingTrack?.remainingPeriod || '') : (newTrack.remainingPeriod || '')}
                  onChange={(e) => {
                    const period = parseFloat(e.target.value) || 0;
                    const amount = isEditing ? (editingTrack?.remainingAmount || 0) : (newTrack.remainingAmount || 0);
                    const rate = isEditing ? (editingTrack?.interestRate || 0) : (newTrack.interestRate || 0);
                    const monthlyPayment = calculateMonthlyPayment(amount, rate, period);
                    
                    if (isEditing && editingTrack) {
                      setEditingTrack(prev => prev ? { 
                        ...prev, 
                        remainingPeriod: period,
                        monthlyPayment: monthlyPayment
                      } : null);
                    } else {
                      setNewTrack(prev => ({ 
                        ...prev, 
                        remainingPeriod: period,
                        monthlyPayment: monthlyPayment
                      }));
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Calculated Monthly Payment Display */}
            {((isEditing ? editingTrack?.monthlyPayment : newTrack.monthlyPayment) || 0) > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-green-600 mb-1">החזר חודשי מחושב</p>
                  <p className="text-2xl font-bold text-green-700">
                    ₪{((isEditing ? editingTrack?.monthlyPayment : newTrack.monthlyPayment) || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center mt-6">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingTrack(null);
                      setNewTrack({
                        bankName: '',
                        trackType: 'prime',
                        remainingAmount: 0,
                        interestRate: 0,
                        remainingPeriod: 0,
                        monthlyPayment: 0
                      });
                    }}
                  >
                    ביטול
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingTrack) {
                        setRefinanceData(prev => ({
                          ...prev,
                          currentTracks: prev.currentTracks.map(track => 
                            track.id === editingTrack.id ? editingTrack : track
                          )
                        }));
                        setIsEditing(false);
                        setEditingTrack(null);
                        setNewTrack({
                          bankName: '',
                          trackType: 'prime',
                          remainingAmount: 0,
                          interestRate: 0,
                          remainingPeriod: 0,
                          monthlyPayment: 0
                        });
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    עדכן מסלול
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    if (refinanceData.bankName && newTrack.trackType) {
                      setRefinanceData(prev => ({
                        ...prev,
                        currentTracks: [...prev.currentTracks, { 
                          ...newTrack, 
                          id: Date.now().toString(),
                          bankName: refinanceData.bankName,
                          amount: newTrack.remainingAmount || 0
                        } as MortgageTrack]
                      }));
                      setNewTrack({
                        trackType: 'prime',
                        remainingAmount: 0,
                        interestRate: 0,
                        remainingPeriod: 0,
                        monthlyPayment: 0
                      });
                    }
                  }}
                  disabled={!refinanceData.bankName || !newTrack.trackType}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-5 h-5 ml-2" />
                  הוסף מסלול
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center mt-8">
        <Button
          variant="outline"
          onClick={() => setInputMethod(null)}
          className="px-6 py-3"
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
          חזור
        </Button>
        <Button
          onClick={() => {
            // Here you would proceed to refinance analysis
            alert('נתוני המשכנתא נשמרו בהצלחה!');
          }}
          disabled={refinanceData.currentTracks.length === 0}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Target className="w-5 h-5 ml-2" />
          המשך לניתוח מיחזור
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Navigation */}
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <NavBar />
      </div>
      
      <div className="container mx-auto px-6 py-12">
        {!inputMethod && renderInputMethodSelection()}
        {inputMethod === 'scan' && renderScanUpload()}
        {inputMethod === 'manual' && renderManualInput()}
      </div>
      
      {/* Modals */}
      <MortgageDetailsModal
        mix={showDetailsModal}
        isOpen={!!showDetailsModal}
        onClose={() => setShowDetailsModal(null)}
      />
      
      {showScenarioAnalysis && (
        <ScenarioAnalysis
          baseMix={showScenarioAnalysis}
          onClose={() => setShowScenarioAnalysis(null)}
        />
      )}
    </div>
  );
}
