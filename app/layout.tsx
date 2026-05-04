import type { Metadata } from "next";
import SessionProvider from "@/components/providers/SessionProvider";
import { CallProvider } from "@/components/providers/CallProvider";
import { ToastProvider } from "@/components/ui/toast";
import { SmoothScroll } from "@/components/layouts/SmoothScroll";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import FloatingActionButton from "@/components/actions/FloatingActionButton";
import { NavigationProvider } from "@/lib/navigation-context";
import GlobalMessagePopup from "@/components/notifications/GlobalMessagePopup";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevConnect - Real-time Social Platform",
  description: "DevConnect is the best place for developers and tech fans to connect, chat, and share ideas. Join our friendly community of programmers and learners building the future together.",
  keywords: ["developers", "social network", "tech friends", "learn coding", "programmer chat", "coding help", "software engineers", "IT community", "web development", "find developers", "programming groups", "tech news"],
  authors: [{ name: "DevConnect Team" }],
  creator: "DevConnect",
  publisher: "DevConnect",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    google: "google014280154b134931",
  },
  alternates: {
    canonical: "https://dev-connect-iota-silk.vercel.app/",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  openGraph: {
    title: "DevConnect - Real-time Social Platform",
    description: "Connect, share, and engage with developers in real-time.",
    url: "https://devconnect.com",
    siteName: "DevConnect",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevConnect - Real-time Social Platform",
    description: "Connect, share, and engage with developers in real-time.",
    creator: "@devconnect",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "DevConnect",
    "description": "Connect, share, and engage with developers in real-time.",
    "applicationCategory": "SocialNetworkingApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Organization",
      "name": "DevConnect"
    }
  };

  return (
    <html lang="en" className="dark scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-[#0a0a0a] text-[#ededed]">
        <SmoothScroll>
          <SessionProvider>
            <CallProvider>
              <NavigationProvider>
                <ToastProvider />
                {children}
                <GlobalMessagePopup />
                <MobileBottomNav />
                <FloatingActionButton />
              </NavigationProvider>
            </CallProvider>
          </SessionProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
