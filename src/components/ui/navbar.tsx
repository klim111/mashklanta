"use client";

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
import { MenuIcon, Shield, Home, TrendingUp, Users, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();

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
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300">
                <LogIn className="w-4 h-4 ml-2" />
                התחברות
              </Button>
            </Link>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                  <TrendingUp className="w-4 h-4 ml-2" />
                  התחל עכשיו
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center text-gray-900">הצטרף לפלטפורמה</DialogTitle>
                  <DialogDescription className="text-center text-gray-600">
                    בחר את התוכנית המתאימה לך והתחל את המסע למשכנתא חכמה ומקצועית
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName" className="text-gray-700 font-semibold">שם מלא</Label>
                      <Input id="fullName" placeholder="שם מלא" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 font-semibold">טלפון</Label>
                      <Input id="phone" type="tel" placeholder="050-1234567" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email-register" className="text-gray-700 font-semibold">אימייל</Label>
                    <Input id="email-register" type="email" placeholder="you@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="service" className="text-gray-700 font-semibold">בחר תוכנית</Label>
                    <select id="service" className="w-full p-3 border-2 border-gray-200 rounded-lg mt-1 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="">בחר תוכנית...</option>
                      <option value="full">ייעוץ מלא עם בינה מלאכותית - ₪399</option>
                      <option value="hybrid">ייעוץ היברידי - ₪199</option>
                      <option value="basic">כלים בסיסיים - ₪99</option>
                    </select>
                  </div>
                  <Link href="/auth/register" className="block">
                    <Button className="w-full text-lg py-4 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                      התחל עכשיו - ללא התחייבות
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-gray-500">
                    כבר יש לך חשבון? <Link href="/auth/login" className="text-blue-600 underline font-semibold hover:text-blue-700">התחבר</Link>
                  </p>
                </div>
              </DialogContent>
            </Dialog>
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
                      <Shield className="w-4 h-4 ml-2" />
                      התחברות
                    </Button>
                  </Link>

                  <Link href="/auth/register">
                    <Button size="lg" className="w-full font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                      <TrendingUp className="w-4 h-4 ml-2" />
                      התחל עכשיו
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
} 