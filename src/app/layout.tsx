import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

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
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
