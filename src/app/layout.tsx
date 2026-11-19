import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ConsentGate } from "@/components/analytics/ConsentGate";
import { SITE_ORIGIN } from "@/lib/reference";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/structuredData";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();
const SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
  || 'xkQ3RE8JHqlyb0L0KlRUiAyzbn3q7in0IY1tdw3icU0';
const SITE_TITLE = "Native Waters — Indian rivers and native freshwater fishes";
const SITE_DESCRIPTION =
  "Explore sourced native freshwater fish records for five Indian river systems — Ganga, Brahmaputra, Cauvery, Krishna and Godavari — with an interactive underwater experience and an evidence-based field guide.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101c1e",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_TITLE,
    template: "%s | Native Waters",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Native Waters",
  alternates: {
    canonical: "/",
  },
  verification: SITE_VERIFICATION ? { google: SITE_VERIFICATION } : undefined,
  openGraph: {
    type: "website",
    locale: "en",
    siteName: "Native Waters",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={[websiteSchema(), organizationSchema()]} />
        {children}
        {process.env.VERCEL === "1" ? <Analytics /> : null}
        {GA_ID ? <ConsentGate gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
