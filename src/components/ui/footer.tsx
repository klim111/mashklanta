"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Phone, Mail } from "lucide-react"
import { SITE_CONTACT } from "@/lib/site-contact"

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">מ</span>
              </div>
              <h3 className="text-subtitle font-bold text-white">משכלנתא</h3>
            </div>
            <p className="text-slate-300 leading-relaxed">
              הפלטפורמה החכמה לייעוץ משכנתאות. אנחנו עוזרים לכם למצוא את התמהיל המושלם ולחסוך מאות אלפי שקלים.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">קישורים מהירים</h4>
            <ul className="space-y-2 text-slate-300">
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">איך זה עובד</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">תמחור</Link></li>
              <li><Link href="/#free-tools" className="hover:text-white transition-colors">הכלים החינמיים</Link></li>
              <li><Link href="/demo" className="hover:text-white transition-colors">הכירו את הכלים</Link></li>
              <li><Link href="/learn" className="hover:text-white transition-colors">מרכז למידה</Link></li>
              <li><Link href="/auth/register" className="hover:text-white transition-colors">הרשמה</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">השירותים שלנו</h4>
            <ul className="space-y-2 text-slate-300">
              <li><Link href="/pricing#tracks" className="hover:text-white transition-colors">מסלול עצמאי / היברידי</Link></li>
              <li><Link href="/pricing#advisory" className="hover:text-white transition-colors">מסלול בליווי</Link></li>
              <li><Link href="/consult" className="hover:text-white transition-colors">היוועצו עם יועץ</Link></li>
              <li><Link href="/dashboard/mix-planner" className="hover:text-white transition-colors">בניית תמהיל</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">יצירת קשר</h4>
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
                <span dir="ltr" className="whitespace-nowrap">{SITE_CONTACT.email}</span>
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
              <Link href="/accessibility" className="hover:text-white transition-colors">הצהרת נגישות</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
} 