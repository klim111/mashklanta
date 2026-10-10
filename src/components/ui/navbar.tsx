"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronDown, MenuIcon, MessageCircle, Shield, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Mashkalanta from "@/components/ui/mashkalanta";
import { demoId } from '@/demo/demo-attr';
import { CONSULT_REASONS, consultHref } from "@/lib/consult-reasons";

/**
 * הקישורים בסרגל העליון. `short` מוצג במסכים בינוניים, והשם המלא רק כשיש מקום.
 * קישור שמתחיל ב-"/#" קופץ לחלק בעמוד הבית.
 */
const NAV_LINKS = [
  { href: "/how-it-works", label: "איך זה עובד" },
  { href: "/pricing", label: "תמחור" },
  { href: "/#free-tools", label: "הכלים החינמיים של משכלנתא", short: "הכלים החינמיים" },
  { href: "/#stats", label: "שוק המשכנתאות" },
  { href: "/demo", label: "הכירו את הכלים של משכלנתא", short: "הכירו את הכלים" },
];

const linkClass =
  "text-button 2xl:text-base text-gray-700 hover:text-blue-600 font-semibold transition-all duration-300 hover:scale-105 whitespace-nowrap";

/** בעמוד הבית קישור לחלק בעמוד גולל אליו בלי לטעון מחדש */
function useHashScroll() {
  const pathname = usePathname();
  return (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/" || !href.startsWith("/#")) return;
    const target = document.getElementById(href.slice(2));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
  };
}

function ConsultMenu({ className = "" }: { className?: string }) {
  return (
    <DropdownMenu.Root dir="rtl" modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          size="lg"
          className={`px-4 2xl:px-6 font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-lg data-[state=open]:bg-violet-700 ${className}`}
          {...demoId('nav-consult')}
        >
          <MessageCircle className="w-4 h-4 ml-2" />
          היוועצו איתנו
          <ChevronDown className="w-4 h-4 mr-1.5 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-2xl outline-none border border-slate-200 bg-white p-2 text-right shadow-xl"
        >
          {CONSULT_REASONS.map((reason) => {
            const Icon = reason.icon;
            return (
              <DropdownMenu.Item key={reason.id} asChild>
                <Link
                  href={consultHref(reason.id)}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-gray-800 outline-none transition-colors hover:bg-violet-50 focus:bg-violet-50"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                  <span className="text-button font-semibold leading-snug">{reason.label}</span>
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function NavBar() {
  const { data: session } = useSession();
  const onNavClick = useHashScroll();

  return (
    <header className="bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100 px-4 md:px-6 py-2 flex justify-between items-center gap-3" {...demoId('nav-root')}>
      <Link href="/" className="shrink-0" aria-label="משכלנתא — עמוד הבית">
        <Mashkalanta variant="nav" autoPlay />
      </Link>

      <nav className="hidden xl:flex min-w-0 items-center gap-4 2xl:gap-7" {...demoId('nav-links')}>
        {NAV_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick(item.href)}
            className={linkClass}
            {...demoId(`nav-link-${item.href}`)}
          >
            {item.short ? (
              <>
                <span className="2xl:hidden">{item.short}</span>
                <span className="hidden 2xl:inline">{item.label}</span>
              </>
            ) : (
              item.label
            )}
          </Link>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2 2xl:gap-3">
        <ConsultMenu className="group hidden sm:inline-flex" />

        <div className="hidden xl:flex items-center gap-2 2xl:gap-3">
          {session ? (
            <>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-4 2xl:px-6 font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300"
                >
                  <Shield className="w-4 h-4 ml-2" />
                  אזור אישי
                </Button>
              </Link>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                יציאה
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-4 2xl:px-6 font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300"
                >
                  <LogIn className="w-4 h-4 ml-2" />
                  התחברות
                </Button>
              </Link>

              <Link href="/auth/register">
                <Button size="lg" className="px-4 2xl:px-6 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                  <UserPlus className="w-4 h-4 ml-2" />
                  הרשמה
                </Button>
              </Link>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" className="text-gray-700 hover:text-blue-600" aria-label="תפריט ראשי">
              <MenuIcon className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-white overflow-y-auto" dir="rtl">
            <div className="flex flex-col gap-6 pt-6">
              <SheetClose asChild>
                <Link href="/" className="pb-4 border-b border-gray-200">
                  <Mashkalanta variant="nav" autoPlay />
                </Link>
              </SheetClose>

              <nav className="flex flex-col gap-4">
                {NAV_LINKS.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavClick(item.href)}
                      className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <div className="mb-3 flex items-center gap-2 font-bold text-violet-800">
                  <MessageCircle className="h-5 w-5" />
                  היוועצו איתנו
                </div>
                <div className="flex flex-col gap-2">
                  {CONSULT_REASONS.map((reason) => (
                    <SheetClose asChild key={reason.id}>
                      <Link
                        href={consultHref(reason.id)}
                        className="rounded-xl bg-white px-3 py-2.5 text-button font-semibold leading-snug text-gray-800 shadow-sm transition-colors hover:text-violet-700"
                      >
                        {reason.label}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              </div>

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
                        אזור אישי
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

                    <Link href="/auth/register">
                      <Button size="lg" className="w-full font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                        <UserPlus className="w-4 h-4 ml-2" />
                        הרשמה
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
