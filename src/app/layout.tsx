import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hills-and-partners AI",
  description: "Cyberpunk Web Registration Console connected to n8n",
  applicationName: "Hills-and-partners AI",
  themeColor: "#070018",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          bg-black
          text-white
          antialiased
          min-h-screen
        `}
      >
        {children}
      </body>
    </html>
  );
}