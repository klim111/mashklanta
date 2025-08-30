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
import { MenuIcon, Shield, Calculator, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-financial border-b border-financial-gray-100 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-financial-gradient rounded-xl flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black text-financial-gradient">משכלתנא</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        <a href="#process" className="text-financial-gray-700 hover:text-financial-primary font-semibold transition-all duration-300 hover:scale-105">תהליך</a>
        <a href="#benefits" className="text-financial-gray-700 hover:text-financial-primary font-semibold transition-all duration-300 hover:scale-105">יתרונות</a>
        <a href="#stats" className="text-financial-gray-700 hover:text-financial-primary font-semibold transition-all duration-300 hover:scale-105">נתונים</a>
        <Link href="/consumer-loans" className="text-financial-gray-700 hover:text-financial-primary font-semibold transition-all duration-300 hover:scale-105">הלוואות צרכניות</Link>
        <a href="#contact" className="text-financial-gray-700 hover:text-financial-primary font-semibold transition-all duration-300 hover:scale-105">צור קשר</a>
      </nav>

      {/* Desktop buttons */}
      <div className="hidden md:flex items-center gap-3">
        {session ? (
          // Logged in user
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="font-semibold">
                <Shield className="w-4 h-4 ml-2" />
                לוח הבקרה
              </Button>
            </Link>
            <span className="text-sm text-financial-gray-700">שלום, {session.user?.name || session.user?.email}</span>
            <Button 
              onClick={() => signOut({ callbackUrl: '/' })}
              variant="ghost" 
              size="sm"
              className="text-financial-gray-600 hover:text-financial-gray-900"
            >
              יציאה
            </Button>
          </div>
        ) : (
          // Not logged in
          <>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="font-semibold">
                <Shield className="w-4 h-4 ml-2" />
                התחברות
              </Button>
            </Link>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="font-semibold shadow-financial">
                  <TrendingUp className="w-4 h-4 ml-2" />
                  התחל עכשיו
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center text-financial-gray-900">הצטרף לפלטפורמה</DialogTitle>
                  <DialogDescription className="text-center text-financial-gray-600">
                    בחר את התוכנית המתאימה לך והתחל את המסע למשכנתא חכמה ומקצועית
                  </DialogDescription>
                </DialogHeader>
                <div className="form-financial space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName" className="text-financial-gray-700 font-semibold">שם מלא</Label>
                      <Input id="fullName" placeholder="שם מלא" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-financial-gray-700 font-semibold">טלפון</Label>
                      <Input id="phone" type="tel" placeholder="050-1234567" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email-register" className="text-financial-gray-700 font-semibold">אימייל</Label>
                    <Input id="email-register" type="email" placeholder="you@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="service" className="text-financial-gray-700 font-semibold">בחר תוכנית</Label>
                    <select id="service" className="w-full p-3 border-2 border-financial-gray-200 rounded-lg mt-1 bg-white focus:border-financial-primary focus:outline-none focus:ring-2 focus:ring-financial-primary/20">
                      <option value="">בחר תוכנית...</option>
                      <option value="full">ייעוץ מלא עם בינה מלאכותית - ₪399</option>
                      <option value="hybrid">ייעוץ היברידי - ₪199</option>
                      <option value="basic">כלים בסיסיים - ₪99</option>
                    </select>
                  </div>
                  <Link href="/auth/register" className="block">
                    <Button variant="success" className="w-full text-lg py-4 font-semibold">
                      התחל עכשיו - ללא התחייבות
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-financial-gray-500">
                    כבר יש לך חשבון? <Link href="/auth/login" className="text-financial-primary underline font-semibold">התחבר</Link>
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
          <Button variant="ghost" size="icon">
            <MenuIcon className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-white">
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex items-center gap-3 pb-4 border-b border-financial-gray-200">
              <div className="w-10 h-10 bg-financial-gradient rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-financial-gradient">משכלתנא</span>
            </div>
            
            <nav className="flex flex-col gap-4">
              <a href="#process" className="text-financial-gray-700 hover:text-financial-primary font-semibold text-lg transition-colors">תהליך</a>
              <a href="#benefits" className="text-financial-gray-700 hover:text-financial-primary font-semibold text-lg transition-colors">יתרונות</a>
              <a href="#stats" className="text-financial-gray-700 hover:text-financial-primary font-semibold text-lg transition-colors">נתונים</a>
              <Link href="/consumer-loans" className="text-financial-gray-700 hover:text-financial-primary font-semibold text-lg transition-colors">הלוואות צרכניות</Link>
              <a href="#contact" className="text-financial-gray-700 hover:text-financial-primary font-semibold text-lg transition-colors">צור קשר</a>
            </nav>

            <div className="flex flex-col gap-3 pt-4 border-t border-financial-gray-200">
              {session ? (
                // Logged in user - mobile
                <div className="space-y-3">
                  <Link href="/dashboard">
                    <Button variant="outline" size="lg" className="w-full font-semibold">
                      <Shield className="w-4 h-4 ml-2" />
                      לוח הבקרה
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    variant="ghost" 
                    size="lg"
                    className="w-full text-financial-gray-600 hover:text-financial-gray-900"
                  >
                    יציאה
                  </Button>
                </div>
              ) : (
                // Not logged in - mobile
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="lg" className="w-full font-semibold">
                      <Shield className="w-4 h-4 ml-2" />
                      התחברות
                    </Button>
                  </Link>

                  <Link href="/auth/register">
                    <Button size="lg" className="w-full font-semibold shadow-financial">
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