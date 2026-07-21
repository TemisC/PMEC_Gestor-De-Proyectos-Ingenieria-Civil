import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PMEC",
  description: "Gestión de proyectos de ingeniería civil y arquitectura.",
};

// Mismo tema oscuro que el SPA original (bg-gray-900/text-gray-100) —
// se aplica globalmente para que login/home también lo tengan, no solo
// las vistas con sidebar (ver src/app/(app)/layout.tsx).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-900 text-gray-100">
        {children}
      </body>
    </html>
  );
}
