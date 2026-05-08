import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Friluftskompis",
  description: "Norwegian outdoor trip planning app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
