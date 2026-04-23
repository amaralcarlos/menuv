import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Menuv — Gestão inteligente de refeições',
  description: 'Plataforma de gestão de marmitas e refeições corporativas.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Menuv — Gestão inteligente de refeições',
    description: 'Plataforma de gestão de marmitas e refeições corporativas.',
    url: 'https://app.menuv.com.br',
    siteName: 'Menuv',
    images: [
      {
        url: 'https://app.menuv.com.br/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Menuv — Gestão inteligente de refeições',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Menuv — Gestão inteligente de refeições',
    description: 'Plataforma de gestão de marmitas e refeições corporativas.',
    images: ['https://app.menuv.com.br/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
