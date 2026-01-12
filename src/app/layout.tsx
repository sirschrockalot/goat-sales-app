import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { VapiProvider } from "@/contexts/VapiContext";
import { AuthProvider } from "@/contexts/AuthContext";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Goat Sales Training App",
  description: "AI-powered sales training based on Eric Cline's Sales Goat Framework",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <VapiProvider>
            {children}
          </VapiProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
