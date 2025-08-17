import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'GreenMetrics',
    template: '%s — GreenMetrics',
  },
  description: 'ESG carbon reporting and supply chain transparency platform',
  keywords: ['ESG', 'carbon reporting', 'supply chain', 'sustainability'],
  authors: [{ name: 'GreenMetrics Team' }],
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'GreenMetrics',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
