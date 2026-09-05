'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  UserCheck, 
  X, 
  Mail, 
  Lock, 
  AlertCircle, 
  Loader2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvisorLoginModalProps {
  onClose: () => void;
}

export default function AdvisorLoginModal({ onClose }: AdvisorLoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('שם משתמש או סיסמה שגויים');
      } else {
        // Check if user is an advisor
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        
        if (session?.user?.role === 'ADVISOR') {
          onClose();
          router.push('/advisor-dashboard');
        } else {
          setError('אין לך הרשאות יועץ');
        }
      }
    } catch (error) {
      setError('אירעה שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  if (showRegisterModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 min-h-screen flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              הצטרף לנבחרת היועצים
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              הצטרף לנבחרת היועצים של משכנתא ועזור ללקוחות למצוא את המשכנתא המושלמת
            </p>
            
            <div className="space-y-4">
              <Link href="/auth/register?role=ADVISOR" className="block">
                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={onClose}
                >
                  התחל תהליך הרשמה
                </Button>
              </Link>
              
              <Button
                variant="outline"
                size="lg"
                className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
                onClick={() => setShowRegisterModal(false)}
              >
                חזרה להתחברות
              </Button>
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 min-h-screen flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            התחברות ליועצי משכנתאות
          </h2>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            התחבר לחשבון היועץ שלך
          </p>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                שם משתמש או מייל
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="שם משתמש או your@email.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                סיסמה
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מתחבר...
                </>
              ) : (
                'התחבר'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">או</span>
            </div>
          </div>

          {/* Register Link */}
          <Button
            variant="outline"
            size="lg"
            className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
            onClick={() => setShowRegisterModal(true)}
          >
            הצטרף לנבחרת היועצים של משכנתא
          </Button>
          
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

