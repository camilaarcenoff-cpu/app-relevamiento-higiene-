import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relevamiento — Higiene Urbana GCBA",
  description: "App interna de seguimiento de relevamientos por manzana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
