import type { Metadata } from "next";
import { Saira_Condensed, EB_Garamond, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Saira_Condensed({ 
  weight: ["400"], 
  subsets: ["latin"], 
  variable: "--font-display" 
});

const textFont = EB_Garamond({ 
  weight: ["400"], 
  subsets: ["latin"], 
  variable: "--font-text" 
});

const monoFont = JetBrains_Mono({ 
  weight: ["400"], 
  subsets: ["latin"], 
  variable: "--font-mono" 
});

export const metadata: Metadata = {
  title: "GradeWise — Performance Engineering",
  description: "Austere luxury steel grade selection. Powered by Jindal Stainless.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${textFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-text">{children}</body>
    </html>
  );
}
