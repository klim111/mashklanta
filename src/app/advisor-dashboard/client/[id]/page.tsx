'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Home as HomeIcon,
  LogOut,
  ChevronLeft,
  Video
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import VideoCallModal from '@/components/advisor-dashboard/VideoCallModal';

type ClientStatus = 'POTENTIAL' | 'ACTIVE' | 'IN_PROCESS';
type ActionType = 'CALL' | 'EMAIL' | 'MEETING' | 'DOCUMENT_REVIEW' | 'RATE_NEGOTIATION' | 'APPLICATION_SUBMISSION' | 'FOLLOW_UP';
type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: ClientStatus;
  progress: number;
  income?: number;
  expenses?: number;
  creditScore?: number;
  downPayment?: number;
  propertyValue?: number;
  mortgageMixes?: any;
  bankRates?: any;
  createdAt: string;
  updatedAt: string;
}

interface ClientAction {
  id: string;
  type: ActionType;
  description: string;
  status: ActionStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
}

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [actions, setActions] = useState<ClientAction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'documents' | 'mortgage-mixes' | 'bank-rates'>('overview');
  const [videoCallModal, setVideoCallModal] = useState<{isOpen: boolean, client: Client | null}>({
    isOpen: false,
    client: null
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
    } else if (session.user?.role !== 'ADVISOR') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  // Mock data - replace with real API calls
  useEffect(() => {
    // Mock client data
    setClient({
      id: params.id,
      name: 'דוד כהן',
      email: 'david@example.com',
      phone: '050-1234567',
      address: 'רחוב הרצל 123, תל אביב',
      status: 'ACTIVE',
      progress: 75,
      income: 25000,
      expenses: 15000,
      creditScore: 750,
      downPayment: 400000,
      propertyValue: 2000000,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-15'
    });

    // Mock actions
    setActions([
      {
        id: '1',
        type: 'CALL',
        description: 'שיחה עם הלקוח לגבי מסמכים חסרים',
        status: 'COMPLETED',
        dueDate: '2024-01-10',
        completedAt: '2024-01-10',
        createdAt: '2024-01-08'
      },
      {
        id: '2',
        type: 'DOCUMENT_REVIEW',
        description: 'בדיקת מסמכי הכנסה ותעסוקה',
        status: 'IN_PROGRESS',
        dueDate: '2024-01-20',
        createdAt: '2024-01-12'
      },
      {
        id: '3',
        type: 'RATE_NEGOTIATION',
        description: 'משא ומתן על ריביות עם הבנקים',
        status: 'PENDING',
        dueDate: '2024-01-25',
        createdAt: '2024-01-15'
      }
    ]);

    // Mock reminders
    setReminders([
      {
        id: '1',
        title: 'הגשת מסמכים לבנק',
        description: 'להעביר את כל המסמכים הנדרשים לבנק לאומי',
        dueDate: '2024-01-22',
        isCompleted: false,
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        title: 'פגישה עם הלקוח',
        description: 'פגישת המשך לדיון על התנאים הסופיים',
        dueDate: '2024-01-28',
        isCompleted: false,
        createdAt: '2024-01-16'
      }
    ]);
  }, [params.id]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'ADVISOR') {
    return null;
  }

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'POTENTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROCESS': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ClientStatus) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />;
      case 'POTENTIAL': return <AlertCircle className="w-4 h-4" />;
      case 'IN_PROCESS': return <Clock className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: ClientStatus) => {
    switch (status) {
      case 'ACTIVE': return 'אקטיבי';
      case 'POTENTIAL': return 'פוטנציאלי';
      case 'IN_PROCESS': return 'בתהליך';
      default: return 'לא ידוע';
    }
  };

  const getActionTypeText = (type: ActionType) => {
    switch (type) {
      case 'CALL': return 'שיחה';
      case 'EMAIL': return 'מייל';
      case 'MEETING': return 'פגישה';
      case 'DOCUMENT_REVIEW': return 'בדיקת מסמכים';
      case 'RATE_NEGOTIATION': return 'משא ומתן ריביות';
      case 'APPLICATION_SUBMISSION': return 'הגשת בקשה';
      case 'FOLLOW_UP': return 'מעקב';
      default: return 'פעולה';
    }
  };

  const getActionStatusColor = (status: ActionStatus) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const startVideoCall = () => {
    if (client) {
      setVideoCallModal({
        isOpen: true,
        client: client
      });
    }
  };

  const closeVideoCall = () => {
    setVideoCallModal({
      isOpen: false,
      client: null
    });
  };

  const tabs = [
    { id: 'overview', label: 'סקירה כללית', icon: User },
    { id: 'actions', label: 'פעולות', icon: Activity },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'mortgage-mixes', label: 'תמהילים', icon: PieChart },
    { id: 'bank-rates', label: 'ריביות בנקים', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/advisor-dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ChevronLeft className="w-5 h-5" />
                חזרה לדשבורד
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <HomeIcon className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl">משכנתא - יועצים</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium">{session.user?.name || session.user?.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                יציאה
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {client && (
          <>
            {/* Client Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(client.status)}`}>
                          {getStatusIcon(client.status)}
                          {getStatusText(client.status)}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>התקדמות:</span>
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${client.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{client.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={startVideoCall}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      שיחת וידאו
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      ערוך
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      פעולה חדשה
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="flex border-b overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Client Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">פרטי לקוח</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">מייל</p>
                              <p className="font-medium">{client.email}</p>
                            </div>
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">טלפון</p>
                                <p className="font-medium">{client.phone}</p>
                              </div>
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center gap-3 md:col-span-2">
                              <MapPin className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">כתובת</p>
                                <p className="font-medium">{client.address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">פרטים פיננסיים</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {client.income && (
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">הכנסה חודשית</p>
                              <p className="text-xl font-bold text-green-600">₪{client.income.toLocaleString()}</p>
                            </div>
                          )}
                          {client.expenses && (
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                              <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">הוצאות חודשיות</p>
                              <p className="text-xl font-bold text-red-600">₪{client.expenses.toLocaleString()}</p>
                            </div>
                          )}
                          {client.creditScore && (
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">ציון אשראי</p>
                              <p className="text-xl font-bold text-blue-600">{client.creditScore}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">פרטי הנכס</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {client.propertyValue && (
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                              <HomeIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">ערך הנכס</p>
                              <p className="text-xl font-bold text-purple-600">₪{client.propertyValue.toLocaleString()}</p>
                            </div>
                          )}
                          {client.downPayment && (
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                              <DollarSign className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">מקדמה</p>
                              <p className="text-xl font-bold text-orange-600">₪{client.downPayment.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Recent Actions */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">פעולות אחרונות</h3>
                        <div className="space-y-3">
                          {actions.slice(0, 3).map((action) => (
                            <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{getActionTypeText(action.type)}</p>
                                <p className="text-xs text-gray-600">{action.description}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionStatusColor(action.status)}`}>
                                {action.status === 'COMPLETED' ? 'הושלם' : 
                                 action.status === 'IN_PROGRESS' ? 'בתהליך' : 
                                 action.status === 'PENDING' ? 'ממתין' : 'בוטל'}
                              </span>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('actions')}>
                          צפה בכל הפעולות
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Upcoming Reminders */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">תזכורות קרובות</h3>
                        <div className="space-y-3">
                          {reminders.filter(r => !r.isCompleted).slice(0, 3).map((reminder) => (
                            <div key={reminder.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <p className="font-medium text-sm">{reminder.title}</p>
                              <p className="text-xs text-gray-600 mb-2">{reminder.description}</p>
                              <p className="text-xs text-yellow-600">
                                {new Date(reminder.dueDate).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">פעולות</h2>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        פעולה חדשה
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {actions.map((action) => (
                        <div key={action.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Activity className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{getActionTypeText(action.type)}</h3>
                                <p className="text-gray-600 text-sm">{action.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                  <span>נוצר: {new Date(action.createdAt).toLocaleDateString('he-IL')}</span>
                                  {action.dueDate && (
                                    <span>תאריך יעד: {new Date(action.dueDate).toLocaleDateString('he-IL')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionStatusColor(action.status)}`}>
                                {action.status === 'COMPLETED' ? 'הושלם' : 
                                 action.status === 'IN_PROGRESS' ? 'בתהליך' : 
                                 action.status === 'PENDING' ? 'ממתין' : 'בוטל'}
                              </span>
                              <button className="p-2 hover:bg-gray-100 rounded-lg">
                                <Edit className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">מסמכים</h2>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Upload className="w-4 h-4 mr-2" />
                        העלה מסמך
                      </Button>
                    </div>
                    
                    <div className="text-center py-16 text-gray-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>אין מסמכים עדיין</p>
                      <p className="text-sm">העלה מסמכים כדי להתחיל</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mortgage Mixes Tab */}
              {activeTab === 'mortgage-mixes' && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">תמהילי משכנתא</h2>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        צור תמהיל חדש
                      </Button>
                    </div>
                    
                    <div className="text-center py-16 text-gray-500">
                      <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>אין תמהילים עדיין</p>
                      <p className="text-sm">צור תמהיל משכנתא מותאם ללקוח</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bank Rates Tab */}
              {activeTab === 'bank-rates' && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">ריביות בנקים</h2>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        הוסף ריבית
                      </Button>
                    </div>
                    
                    <div className="text-center py-16 text-gray-500">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>אין ריביות עדיין</p>
                      <p className="text-sm">הוסף ריביות שהתקבלו מהבנקים</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </>
        )}

        {/* Video Call Modal */}
        {videoCallModal.client && (
          <VideoCallModal
            isOpen={videoCallModal.isOpen}
            onClose={closeVideoCall}
            client={videoCallModal.client}
            advisor={{
              name: session.user?.name || 'יועץ',
              email: session.user?.email || ''
            }}
          />
        )}
      </div>
    </div>
  );
}

