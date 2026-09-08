import type { Metadata } from "next";
import "./globals.css";
import "./production.css";
import "./index-v06.css";

export const metadata: Metadata = {
  title: "Wish North | One list. Every store.",
  description: "Wish anything from anywhere. Share one list with everyone who loves you.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://wishnorth.netlify.app"),
  openGraph: {
    title: "Wish North | One list. Every store.",
    description: "Wish anything from anywhere. Share one list with everyone who loves you.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
