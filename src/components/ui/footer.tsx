"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Phone, Mail, Facebook, Instagram, Linkedin, Twitter } from "lucide-react"
import { Button } from "./button"
import { SITE_CONTACT } from "@/lib/site-contact"

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">מ</span>
              </div>
              <h3 className="text-subtitle font-bold text-white">משכלנתא</h3>
            </div>
            <p className="text-slate-300 leading-relaxed">
              הפלטפורמה החכמה לייעוץ משכנתאות. אנחנו עוזרים לך למצוא את התמהיל המושלם ולחסוך מאות אלפי שקלים.
            </p>
            <div className="flex space-x-4 space-x-reverse">
              <Button variant="outline" size="sm" className="rounded-full p-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full p-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full p-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500">
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full p-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500">
                <Twitter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">קישורים מהירים</h4>
            <ul className="space-y-2 text-slate-300">
              <li><a href="/how-it-works" className="hover:text-white transition-colors">איך זה עובד</a></li>
              <li><a href="/pricing" className="hover:text-white transition-colors">תמחור</a></li>
              <li><a href="/learn" className="hover:text-white transition-colors">מרכז למידה</a></li>
              <li><a href="/mortgage-advisor" className="hover:text-white transition-colors">כלי יועצים</a></li>
              <li><a href="/auth/register" className="hover:text-white transition-colors">הרשמה</a></li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">השירותים שלנו</h4>
            <ul className="space-y-2 text-slate-300">
              <li><a href="/pricing" className="hover:text-white transition-colors">מסלול עצמאי</a></li>
              <li><a href="/pricing#builder" className="hover:text-white transition-colors">מסלול היברידי</a></li>
              <li><a href="/pricing" className="hover:text-white transition-colors">מסלול בליווי</a></li>
              <li><a href="/custom-mix-builder" className="hover:text-white transition-colors">בניית תמהילים</a></li>
              <li><a href="/mortgage-advisor" className="hover:text-white transition-colors">השוואת הצעות</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">צור קשר</h4>
            <div className="space-y-3 text-slate-300">
              <a
                href={SITE_CONTACT.phoneHref}
                className="flex items-center gap-2 hover:text-white transition-colors"
                aria-label={`טלפון: ${SITE_CONTACT.phone}`}
              >
                <Phone className="w-4 h-4 shrink-0 text-blue-500" aria-hidden="true" />
                <span dir="ltr">{SITE_CONTACT.phone}</span>
              </a>
              <a
                href={SITE_CONTACT.emailHref}
                className="flex items-center gap-2 hover:text-white transition-colors"
                aria-label={`אימייל: ${SITE_CONTACT.email}`}
              >
                <Mail className="w-4 h-4 shrink-0 text-blue-500" aria-hidden="true" />
                <span dir="ltr" className="break-all">{SITE_CONTACT.email}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="border-t border-slate-800 mt-8 pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-slate-400 text-sm">
              © {new Date().getFullYear()} משכלנתא. כל הזכויות שמורות.
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-sm text-slate-400">
              <Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link>
              <Link href="/privacy#cookies" className="hover:text-white transition-colors">מדיניות עוגיות</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
} 