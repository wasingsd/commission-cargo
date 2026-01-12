import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from "@/components/Providers";

const thaiFont = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Commission Cargo - ระบบคำนวณค่าคอมมิชชั่นขนส่ง",
  description: "ระบบจัดการและคำนวณค่าคอมมิชชั่นสำหรับธุรกิจขนส่งสินค้า รองรับการคำนวณต้นทุนจาก MAX(CBM×rate, KG×rate) และการจัดการเรททุน",
  keywords: ["commission", "cargo", "logistics", "shipping", "thailand"],
  authors: [{ name: "Commission Cargo Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${thaiFont.variable} ${inter.variable}`}>
      <body className="font-thai">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
