import type { Metadata } from "next";
import SessionProvider from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/ui/toast";
import { SmoothScroll } from "@/components/layouts/SmoothScroll";
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
      <body className="antialiased bg-[#0a0a0a] text-[#ededed]">
        <SmoothScroll>
          <SessionProvider>
            <ToastProvider />
            {children}
          </SessionProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
