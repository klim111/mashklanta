import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

import './App.css'
import { Button } from "@/components/ui/button";

import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";

import { MenuIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import  Statistic  from "@/components/ui/statistic"
import Map from "@/components/ui/map"
import NavBar from "@/components/ui/navbar"
import Hero from "@/components/ui/Hero"
import Services from './components/ui/services';
import { FileText,ShieldCheck,Home,BadgeDollarSign,CheckCircle } from "lucide-react";
import Mashkalanta from "@/components/ui/mashkalanta"
import Timeline from './components/ui/timeline';
import EquityPlanner from './components/ui/equitycalc';
import MortgageCalculator from './components/mortgagecalculator';
function App() {
  const [count, setCount] = useState(0)
{/* <div className="w-screen  min-h-screen flex justify-center items-center bg-red-500">
  <div className='flex justify-center items-center bg-blue-100 w-[70vw] h-screen'></div>\
  <Timeline/>

</div> */}
  return (
 




 <div className="min-h-screen   mx-auto bg-muted text-foreground">
  <NavBar/>

  <Mashkalanta/>
    <Hero/>
  <MortgageCalculator/>
  <Services/>    
  <Map/>
  <Timeline/>
  <Statistic/>
  <EquityPlanner/>
    </div>
  
  );
}




export default App
