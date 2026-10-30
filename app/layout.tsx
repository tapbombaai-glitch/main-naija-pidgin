import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Main Naija Pidgin',
  description: 'Main Naija Pidgin API platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#060A06", fontFamily: "system-ui" }}>{children}</body>
    </html>
  );
}