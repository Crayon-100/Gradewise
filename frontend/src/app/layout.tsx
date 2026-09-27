import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import { SmoothScrollProvider } from "@/components/layout/SmoothScrollProvider";
import "./globals.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--var-instrument",
});

const suisse = localFont({
  src: [
    {
      path: "../../public/fonts/SuisseIntl-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/SuisseIntl-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/SuisseIntl-Bold.woff2",
      weight: "700",
      style: "normal",
    }
  ],
  variable: "--var-suisse",
});

const monument = localFont({
  src: "../../public/fonts/MonumentGrotesk-Mono.woff2",
  weight: "400",
  style: "normal",
  variable: "--var-monument",
});

export const metadata: Metadata = {
  title: "Jindal Steel Grade Selector",
  description: "Advanced steel grade selector",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrument.variable} ${suisse.variable} ${monument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (sessionStorage.getItem("gradewise_has_visited")) {
              document.documentElement.classList.add("skip-preloader");
            }
          } catch (e) {}
        `}} />
      </head>
      <body className="antialiased bg-[#0B1222] text-white overflow-x-hidden">
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
