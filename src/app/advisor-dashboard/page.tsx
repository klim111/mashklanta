'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreHorizontal,
  Filter,
  Search,
  Plus,
  LogOut,
  Home as HomeIcon,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Video
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import VideoCallModal from '@/components/advisor-dashboard/VideoCallModal';

type ClientStatus = 'POTENTIAL' | 'ACTIVE' | 'IN_PROCESS';
type TabType = 'clients' | 'calendar' | 'analytics' | 'settings';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: ClientStatus;
  progress: number;
  lastContact: string;
  nextAction?: string;
  propertyValue?: number;
  downPayment?: number;
  income?: number;
  creditScore?: number;
}

export default function AdvisorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
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
    setClients([
      {
        id: '1',
        name: 'דוד כהן',
        email: 'david@example.com',
        phone: '050-1234567',
        status: 'ACTIVE',
        progress: 75,
        lastContact: '2024-01-15',
        nextAction: 'הגשת מסמכים לבנק',
        propertyValue: 2000000,
        downPayment: 400000,
        income: 25000,
        creditScore: 750
      },
      {
        id: '2',
        name: 'שרה לוי',
        email: 'sarah@example.com',
        phone: '052-9876543',
        status: 'POTENTIAL',
        progress: 25,
        lastContact: '2024-01-10',
        nextAction: 'פגישת ייעוץ',
        propertyValue: 1500000,
        downPayment: 300000,
        income: 18000,
        creditScore: 680
      },
      {
        id: '3',
        name: 'משה ישראלי',
        email: 'moshe@example.com',
        phone: '054-5555555',
        status: 'IN_PROCESS',
        progress: 90,
        lastContact: '2024-01-14',
        nextAction: 'חתימה על חוזה',
        propertyValue: 3000000,
        downPayment: 600000,
        income: 35000,
        creditScore: 800
      }
    ]);
  }, []);

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

  const filteredClients = clients.filter(client => {
    const matchesStatus = filterStatus === 'ALL' || client.status === filterStatus;
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

  const startVideoCall = (client: Client) => {
    console.log('🎥 Starting video call for client:', client.name);
    console.log('👤 Advisor session:', { 
      user: session?.user, 
      role: session?.user?.role,
      email: session?.user?.email 
    });
    setVideoCallModal({
      isOpen: true,
      client: client
    });
  };

  const closeVideoCall = () => {
    setVideoCallModal({
      isOpen: false,
      client: null
    });
  };

  const tabs = [
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'calendar', label: 'לוח שנה', icon: Calendar },
    { id: 'analytics', label: 'אנליטיקה', icon: BarChart3 },
    { id: 'settings', label: 'הגדרות', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
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
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            שלום, {session.user?.name || 'יועץ יקר'}!
          </h1>
          <p className="text-gray-600 mt-2">ברוך הבא לדשבורד היועצים</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">סה"כ לקוחות</p>
                  <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">לקוחות אקטיביים</p>
                  <p className="text-2xl font-bold text-green-600">
                    {clients.filter(c => c.status === 'ACTIVE').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">בתהליך</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {clients.filter(c => c.status === 'IN_PROCESS').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">פוטנציאליים</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {clients.filter(c => c.status === 'POTENTIAL').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
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
          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              {/* Filters and Search */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="חיפוש לקוחות..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as ClientStatus | 'ALL')}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ALL">כל הסטטוסים</option>
                      <option value="ACTIVE">אקטיבי</option>
                      <option value="POTENTIAL">פוטנציאלי</option>
                      <option value="IN_PROCESS">בתהליך</option>
                    </select>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      לקוח חדש
                    </Button>
                  </div>
                </div>
              </div>

              {/* Clients List */}
              <div className="grid gap-4">
                {filteredClients.map((client) => (
                  <Link key={client.id} href={`/advisor-dashboard/client/${client.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{client.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {client.email}
                              </span>
                              {client.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {client.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                              {getStatusIcon(client.status)}
                              {getStatusText(client.status)}
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>התקדמות:</span>
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${client.progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs">{client.progress}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-gray-600">
                            <div>מגע אחרון: {new Date(client.lastContact).toLocaleDateString('he-IL')}</div>
                            {client.nextAction && (
                              <div className="text-blue-600 font-medium">פעולה הבאה: {client.nextAction}</div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startVideoCall(client);
                              }}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                              title="התחל שיחת וידאו"
                            >
                              <Video className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <MoreHorizontal className="w-5 h-5 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-6">לוח שנה</h2>
              <div className="text-center py-16 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>לוח שנה יופיע כאן בקרוב</p>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-6">אנליטיקה</h2>
              <div className="text-center py-16 text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>גרפים וסטטיסטיקות יופיעו כאן בקרוב</p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold mb-6">הגדרות</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">פרטים אישיים</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                      <input
                        type="text"
                        defaultValue={session.user?.name || ''}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">כתובת מייל</label>
                      <input
                        type="email"
                        defaultValue={session.user?.email || ''}
                        disabled
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="font-semibold text-gray-900 mb-3">אבטחה</h3>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    שנה סיסמה
                  </button>
                </div>

                <div className="pt-6 border-t">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    שמור שינויים
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Video Call Modal */}
      {videoCallModal.client && (
        <VideoCallModal
          isOpen={videoCallModal.isOpen}
          onClose={closeVideoCall}
          client={videoCallModal.client}
          advisor={{
            name: session.user?.name || 'יועץ',
            email: session.user?.email || 'advisor@example.com'
          }}
        />
      )}
    </div>
  );
}
