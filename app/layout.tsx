import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vidya — AI tutor for CBSE Class 10",
  description:
    "Ask doubts, get step-by-step solutions and practise board-style questions for every CBSE Class 10 chapter. Math, Science, Social Science, English and IT 402.",
};

export const viewport: Viewport = {
  themeColor: "#060912",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
