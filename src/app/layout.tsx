import type { Metadata } from 'next'
import './globals.css'

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
      <body className="font-hebrew">{children}</body>
    </html>
  )
} 