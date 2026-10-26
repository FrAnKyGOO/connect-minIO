import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MinIO Files | คลังไฟล์",
  description: "จัดเก็บและจัดการไฟล์ของคุณในที่เดียว",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
