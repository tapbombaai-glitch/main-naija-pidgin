import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TapBomba - Naija Pidgin API",
  description: "Authentic Naija Pidgin voice API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}