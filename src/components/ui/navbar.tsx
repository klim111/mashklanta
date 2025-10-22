"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { MenuIcon, Shield, Home, TrendingUp, Users, LogIn, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import AdvisorLoginModal from "@/components/ui/AdvisorLoginModal";

export default function NavBar() {
  const { data: session, status } = useSession();
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);

  return (
    <header className="bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black text-gray-900">משכלתנא</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        <Link href="/interactive-mortgage-journey" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">מפת תהליך</Link>
        <a href="#process" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">תהליך</a>
        <a href="#benefits" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">יתרונות</a>
        <a href="#stats" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">נתונים</a>
        <Link href="/equity-planning" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">תכנון הון עצמי</Link>
        <Link href="/consumer-loans" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">הלוואות צרכניות</Link>
        <Link href="/mortgage-advisor" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">כלי יועצי משכנתא</Link>
        <Link href="/mortgage-application" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">בקשת משכנתא</Link>
        <a href="#contact" className="text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105">צור קשר</a>
      </nav>

      {/* Desktop buttons */}
      <div className="hidden md:flex items-center gap-3">
        {session ? (
          // Logged in user
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300">
                <Shield className="w-4 h-4 ml-2" />
                לוח הבקרה
              </Button>
            </Link>
            <span className="text-sm text-gray-600">שלום, {session.user?.name || session.user?.email}</span>
            <Button 
              onClick={() => signOut({ callbackUrl: '/' })}
              variant="ghost" 
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              יציאה
            </Button>
          </div>
        ) : (
          // Not logged in
          <>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300">
                  <LogIn className="w-4 h-4 ml-2" />
                  התחברות
                </Button>
              </Link>

              <Button 
                size="lg" 
                className="font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                onClick={() => setShowAdvisorModal(true)}
              >
                <UserCheck className="w-4 h-4 ml-2" />
                כניסה ליועצים
              </Button>
            </div>

          </>
        )}
      </div>

      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="text-gray-700 hover:text-blue-600">
            <MenuIcon className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-white">
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900">משכלתנא</span>
            </div>
            
            <nav className="flex flex-col gap-4">
              <Link href="/interactive-mortgage-journey" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">מפת תהליך</Link>
              <a href="#process" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">תהליך</a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">יתרונות</a>
              <a href="#stats" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">נתונים</a>
              <Link href="/consumer-loans" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">הלוואות צרכניות</Link>
              <Link href="/mortgage-advisor" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">כלי יועצי משכנתא</Link>
              <Link href="/mortgage-application" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">בקשת משכנתא</Link>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors">צור קשר</a>
            </nav>

            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
              {session ? (
                // Logged in user - mobile
                <div className="space-y-3">
                  <Link href="/dashboard">
                    <Button variant="outline" size="lg" className="w-full font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600">
                      <Shield className="w-4 h-4 ml-2" />
                      לוח הבקרה
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    variant="ghost" 
                    size="lg"
                    className="w-full text-gray-600 hover:text-gray-900"
                  >
                    יציאה
                  </Button>
                </div>
              ) : (
                // Not logged in - mobile
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="lg" className="w-full font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600">
                      <LogIn className="w-4 h-4 ml-2" />
                      התחברות
                    </Button>
                  </Link>

                  <Button 
                    size="lg" 
                    className="w-full font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                    onClick={() => setShowAdvisorModal(true)}
                  >
                    <UserCheck className="w-4 h-4 ml-2" />
                    כניסה ליועצים
                  </Button>

                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Advisor Login Modal */}
      {showAdvisorModal && (
        <AdvisorLoginModal onClose={() => setShowAdvisorModal(false)} />
      )}
    </header>
  );
} 