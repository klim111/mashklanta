"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { MenuIcon, User, LogOut } from "lucide-react";
import { AuthForms } from "./auth-forms";

export default function NavBar() {
  const { data: session } = useSession();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleAuthClick = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="bg-background shadow-sm px-4 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <span className="text-xl font-bold">משכלתנא</span>
      </div>

      <nav className="hidden md:flex space-x-4">
        <a href="#process" className="hover:underline">תהליך</a>
        <a href="#benefits" className="hover:underline">יתרונות</a>
        <a href="#stats" className="hover:underline">נתונים</a>
        <a href="#contact" className="hover:underline">צור קשר</a>
      </nav>

      {/* Desktop authentication buttons */}
      <div className="hidden md:flex space-x-2">
        {session ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              שלום, {session.user?.name || session.user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              התנתק
            </Button>
          </div>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={() => handleAuthClick("login")}
            >
              התחברות
            </Button>
            <Button onClick={() => handleAuthClick("signup")}>
              התחל עכשיו
            </Button>
          </>
        )}
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger>
            <MenuIcon className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left">
            <NavigationMenu>
              <NavigationMenuList className="flex flex-col gap-3 mt-4">
                <NavigationMenuItem><a href="#process">תהליך</a></NavigationMenuItem>
                <NavigationMenuItem><a href="#benefits">יתרונות</a></NavigationMenuItem>
                <NavigationMenuItem><a href="#stats">נתונים</a></NavigationMenuItem>
                <NavigationMenuItem><a href="#contact">צור קשר</a></NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            <div className="mt-6 flex flex-col space-y-2">
              {session ? (
                <>
                  <div className="text-sm text-muted-foreground mb-2">
                    שלום, {session.user?.name || session.user?.email}
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-1" />
                    התנתק
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => handleAuthClick("login")}
                  >
                    התחברות
                  </Button>
                  <Button onClick={() => handleAuthClick("signup")}>
                    התחל עכשיו
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Authentication Forms */}
      <AuthForms 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        mode={authMode} 
      />
    </header>
  );
} 