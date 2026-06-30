import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dispatch — Last-mile delivery", template: "%s · Dispatch" },
  description: "Transparent delivery pricing, intelligent agent assignment, and end-to-end parcel tracking.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
