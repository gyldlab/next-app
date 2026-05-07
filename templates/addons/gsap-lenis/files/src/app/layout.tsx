import type { Metadata } from "next";
import { Anton, Manrope } from "next/font/google";
import { GsapLenisProvider } from "@/components/gsap-lenis-provider";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GYLDLAB Starter Canvas",
  description: "A stripped-back GYLDLAB starter with GSAP + Lenis already in motion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anton.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <GsapLenisProvider>{children}</GsapLenisProvider>
      </body>
    </html>
  );
}
