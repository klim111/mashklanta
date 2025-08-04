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
import Mashkalanta from "@/components/ui/mashkalanta"



import { FileText,ShieldCheck,Home,BadgeDollarSign,CheckCircle } from "lucide-react";

export default function statistic() {
  return (
<header className="bg-background shadow-sm px-4 py-3 flex justify-between items-center">
     <div className="flex items-center space-x-3">
        {/* <img src="/logo.png" alt="Logo" className="h-8" /> */}
        <span className="text-xl font-bold">משכלתנא</span>
      </div>

      <nav className="hidden md:flex space-x-4">
        <a href="#process" className="hover:underline">תהליך</a>
        <a href="#benefits" className="hover:underline">יתרונות</a>
        <a href="#stats" className="hover:underline">נתונים</a>
        <a href="#contact" className="hover:underline">צור קשר</a>
      </nav>

      {/* Desktop buttons with login modal */}
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

        <Button>התחל תהליך</Button>
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
              <Button>התחל תהליך</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>)}