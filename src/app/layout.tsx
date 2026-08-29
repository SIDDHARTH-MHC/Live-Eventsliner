import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { PRODUCT_NAME } from "@/lib/brand";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: "India-first event platform — run and discover events",
  applicationName: PRODUCT_NAME,
  openGraph: {
    title: PRODUCT_NAME,
    description: "India-first event platform — run and discover events",
    siteName: PRODUCT_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: PRODUCT_NAME,
    description: "India-first event platform — run and discover events",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};
