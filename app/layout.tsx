import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/lib/audio";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MediDeutsch — German grammar for the ward",
  description:
    "German grammar A1–B1 for international medical students and doctors. Every example is set in a hospital.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AudioProvider>{children}</AudioProvider>
      </body>
    </html>
  );
}
