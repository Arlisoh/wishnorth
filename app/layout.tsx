import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wish North | One list. Every store.",
  description: "Wish anything from anywhere. Share one list with everyone who loves you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
