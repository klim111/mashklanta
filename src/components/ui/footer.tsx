"use client"

import { motion } from "framer-motion"
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Linkedin, Twitter } from "lucide-react"
import { Button } from "./button"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">משכלתנא</h3>
            <p className="text-gray-300 leading-relaxed">
              הפלטפורמה החכמה לייעוץ משכנתאות. אנחנו עוזרים לך למצוא את התמהיל המושלם ולחסוך מאות אלפי שקלים.
            </p>
            <div className="flex space-x-4 space-x-reverse">
              <Button variant="outline" size="sm" className="rounded-full p-2">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full p-2">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full p-2">
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full p-2">
                <Twitter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">קישורים מהירים</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">אודותינו</a></li>
              <li><a href="#" className="hover:text-white transition-colors">שירותים</a></li>
              <li><a href="#" className="hover:text-white transition-colors">מחשבונים</a></li>
              <li><a href="#" className="hover:text-white transition-colors">בלוג</a></li>
              <li><a href="#" className="hover:text-white transition-colors">צור קשר</a></li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">השירותים שלנו</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">ייעוץ אוטומטי מלא</a></li>
              <li><a href="#" className="hover:text-white transition-colors">ייעוץ היברידי</a></li>
              <li><a href="#" className="hover:text-white transition-colors">כלים בסיסיים</a></li>
              <li><a href="#" className="hover:text-white transition-colors">בניית תמהילים</a></li>
              <li><a href="#" className="hover:text-white transition-colors">השוואת הצעות</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">צור קשר</h4>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Phone className="w-4 h-4" />
                <span>03-1234567</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Mail className="w-4 h-4" />
                <span>info@mashkalanta.co.il</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <MapPin className="w-4 h-4" />
                <span>תל אביב, ישראל</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Clock className="w-4 h-4" />
                <span>א-ה: 9:00-18:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="border-t border-gray-800 mt-8 pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © 2024 משכלתנא. כל הזכויות שמורות.
            </div>
            <div className="flex space-x-6 space-x-reverse text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">תנאי שימוש</a>
              <a href="#" className="hover:text-white transition-colors">מדיניות פרטיות</a>
              <a href="#" className="hover:text-white transition-colors">מדיניות עוגיות</a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
} 