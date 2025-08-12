import type { Metadata } from 'next'
import './globals.css'
import { Heebo } from 'next/font/google'

const heebo = Heebo({ subsets: ['hebrew'], weight: ['400','500','600','700'], display: 'swap' })

export const metadata: Metadata = {
  title: 'משכלתנא - ייעוץ משכנתאות חכם',
  description: 'פלטפורמה חכמה לייעוץ משכנתאות עם כלים מתקדמים וחישובים מדויקים',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.className} font-sans`}>{children}</body>
    </html>
  )
} 