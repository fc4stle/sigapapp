import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AccessibilityToggle from "@/components/AccessibilityToggle";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sigap Yogyakarta",
  description: "Pantau gempa dan udara di wilayahmu",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <body className="min-h-full flex flex-col font-sans">
        <AccessibilityToggle />
        {children}
      </body>
    </html>
  );
}
