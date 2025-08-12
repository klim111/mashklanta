import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter'
})

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
      <body className={`${inter.className} font-sans antialiased`}>{children}</body>
    </html>
  )
} 