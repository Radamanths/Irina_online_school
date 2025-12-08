import "../src/styles/globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getSiteUrl } from "../src/lib/site-url";

const siteUrl = getSiteUrl();
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...(googleVerification
    ? {
        verification: {
          google: googleVerification
        }
      }
    : {})
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
