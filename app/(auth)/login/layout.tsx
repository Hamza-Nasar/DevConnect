import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | DevConnect",
  description: "Sign in to DevConnect to talk with friends, share your work, and see what's new in the world of tech.",
  openGraph: {
    title: "Login | DevConnect",
    description: "Sign in to connect with your tech community.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
