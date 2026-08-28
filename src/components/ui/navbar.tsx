"use client";

import { useState } from "react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon, Shield, LogIn, UserCheck } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import AdvisorLoginModal from "@/components/ui/AdvisorLoginModal";
import Mashkalanta from "@/components/ui/mashkalanta";

const NAV_LINKS = [
  { href: "/how-it-works", label: "איך זה עובד" },
  { href: "/pricing", label: "תמחור" },
  { href: "/equity-planning", label: "תכנון הון עצמי" },
  { href: "/consumer-loans", label: "הלוואות צרכניות" },
  { href: "/mortgage-advisor", label: "כלי יועצי משכנתא" },
  { href: "/learn", label: "מרכז למידה" },
];

const linkClass =
  "text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105 whitespace-nowrap";

export default function NavBar() {
  const { data: session } = useSession();
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);

  return (
    <header className="bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100 px-4 md:px-6 py-2 flex justify-between items-center gap-3">
      <Link href="/" className="shrink-0" aria-label="משכלתנא — עמוד הבית">
        <Mashkalanta variant="nav" autoPlay />
      </Link>

      <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
        {NAV_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="hidden md:flex items-center gap-3">
        {session ? (
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="lg"
                className="font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300"
              >
                <Shield className="w-4 h-4 ml-2" />
                לוח הבקרה
              </Button>
            </Link>
            <span className="text-sm text-gray-600 hidden xl:inline">
              שלום, {session.user?.name || session.user?.email}
            </span>
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              יציאה
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="lg"
                className="font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300"
              >
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
        )}
      </div>

      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="text-gray-700 hover:text-blue-600">
            <MenuIcon className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-white">
          <div className="flex flex-col gap-6 pt-6">
            <Link href="/" className="pb-4 border-b border-gray-200">
              <Mashkalanta variant="nav" autoPlay />
            </Link>

            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
              {session ? (
                <div className="space-y-3">
                  <Link href="/dashboard">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      <Shield className="w-4 h-4 ml-2" />
                      לוח הבקרה
                    </Button>
                  </Link>
                  <Button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    variant="ghost"
                    size="lg"
                    className="w-full text-gray-600 hover:text-gray-900"
                  >
                    יציאה
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
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

      {showAdvisorModal && <AdvisorLoginModal onClose={() => setShowAdvisorModal(false)} />}
    </header>
  );
}
