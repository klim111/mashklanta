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
import { MenuIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NavBar() {
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

      {/* Desktop buttons with registration modal */}
      <div className="hidden md:flex space-x-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">התחברות</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>התחברות למערכת</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">אימייל</Label>
                <Input id="email" type="email" placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="password">סיסמה</Label>
                <Input id="password" type="password" placeholder="••••••••" />
              </div>
              <Button className="w-full">התחבר</Button>
              <p className="text-xs text-center text-muted-foreground">
                אין לך חשבון? <a href="#" className="text-primary underline">הירשם</a>
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button>התחל עכשיו</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">הרשמה לפלטפורמה</DialogTitle>
              <DialogDescription className="text-center">
                בחר את התוכנית המתאימה לך והתחל את המסע למשכנתא חכמה
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">שם מלא</Label>
                  <Input id="fullName" placeholder="שם מלא" />
                </div>
                <div>
                  <Label htmlFor="phone">טלפון</Label>
                  <Input id="phone" type="tel" placeholder="050-1234567" />
                </div>
              </div>
              <div>
                <Label htmlFor="email-register">אימייל</Label>
                <Input id="email-register" type="email" placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="service">בחר תוכנית</Label>
                <select id="service" className="w-full p-2 border border-gray-300 rounded-md">
                  <option value="">בחר תוכנית...</option>
                  <option value="full">ייעוץ אוטומטי מלא - ₪299</option>
                  <option value="hybrid">ייעוץ היברידי - ₪149</option>
                  <option value="basic">כלים בסיסיים - ₪99</option>
                </select>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-3">
                התחל עכשיו - הרשמה חינם
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                כבר יש לך חשבון? <a href="#" className="text-primary underline">התחבר</a>
              </p>
            </div>
          </DialogContent>
        </Dialog>
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">התחברות</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>התחברות למערכת</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email-mobile">אימייל</Label>
                      <Input id="email-mobile" type="email" placeholder="you@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="password-mobile">סיסמה</Label>
                      <Input id="password-mobile" type="password" placeholder="••••••••" />
                    </div>
                    <Button className="w-full">התחבר</Button>
                    <p className="text-xs text-center text-muted-foreground">
                      אין לך חשבון? <a href="#" className="text-primary underline">הירשם</a>
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>התחל עכשיו</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">הרשמה לפלטפורמה</DialogTitle>
                    <DialogDescription className="text-center">
                      בחר את התוכנית המתאימה לך והתחל את המסע למשכנתא חכמה
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fullName-mobile">שם מלא</Label>
                      <Input id="fullName-mobile" placeholder="שם מלא" />
                    </div>
                    <div>
                      <Label htmlFor="phone-mobile">טלפון</Label>
                      <Input id="phone-mobile" type="tel" placeholder="050-1234567" />
                    </div>
                    <div>
                      <Label htmlFor="email-register-mobile">אימייל</Label>
                      <Input id="email-register-mobile" type="email" placeholder="you@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="service-mobile">בחר תוכנית</Label>
                      <select id="service-mobile" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="">בחר תוכנית...</option>
                        <option value="full">ייעוץ אוטומטי מלא - ₪299</option>
                        <option value="hybrid">ייעוץ היברידי - ₪149</option>
                        <option value="basic">כלים בסיסיים - ₪99</option>
                      </select>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-3">
                      התחל עכשיו - הרשמה חינם
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      כבר יש לך חשבון? <a href="#" className="text-primary underline">התחבר</a>
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
} 