import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Math Mastery",
  description: "Advanced multiplication practice",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChadMath",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming which feels more "app-like"
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "bg-gray-950 text-gray-50 antialiased")}>
        {children}
      </body>
    </html>
  );
}
