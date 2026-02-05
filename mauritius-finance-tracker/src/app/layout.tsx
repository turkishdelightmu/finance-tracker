import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getOrCreateCsrfToken } from "@/lib/csrf";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mauritius Finance Tracker",
  description:
    "A finance tracking application for Mauritius built with Next.js, Prisma, and PostgreSQL.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const csrfToken = await getOrCreateCsrfToken();
  return (
    <html lang="en">
      <head>
        <meta name="csrf-token" content={csrfToken} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
