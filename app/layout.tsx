import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Tindie Design & Manufacturing Marketplace",
  description: "Sell KiCad designs and connect buyers to regional PCB manufacturing partners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
