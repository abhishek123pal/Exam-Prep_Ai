
import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layouts/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExamPrep AI | Smart AKTU Preparation",
  description: "AI-powered mock tests and predictions for AKTU B.Tech students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="antialiased bg-background text-slate-200 flex min-h-screen selection:bg-indigo-500/30">
        {/* 1. वैश्विक साइडबार */}
        <Sidebar />
        
        {/* 2. मुख्य कंटेंट एरिया जहाँ सारे पेजेस रेंडर होंगे */}
        <main className="flex-1 flex flex-col relative max-h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}