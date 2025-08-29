import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "חיפוש פינוי בינוי לפי כתובת",
  description: "חיפוש פינוי בינוי לפי כתובת",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
