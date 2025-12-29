import type { Metadata } from "next";
import SessionProvider from "@/components/providers/SessionProvider";
import { CallProvider } from "@/components/providers/CallProvider";
import { ToastProvider } from "@/components/ui/toast";
import { SmoothScroll } from "@/components/layouts/SmoothScroll";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import FloatingActionButton from "@/components/actions/FloatingActionButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevConnect - Real-time Social Platform",
  description: "Connect, share, and engage with developers in real-time",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased bg-[#0a0a0a] text-[#ededed]">
        <SmoothScroll>
          <SessionProvider>
            <CallProvider>
              <ToastProvider />
              {children}
              <MobileBottomNav />
              <FloatingActionButton />
            </CallProvider>
          </SessionProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
