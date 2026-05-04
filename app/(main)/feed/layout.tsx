import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed | DevConnect",
  description: "See what's happening in the world of technology. Read stories, see projects, and chat with tech fans on DevConnect.",
  openGraph: {
    title: "Feed | DevConnect",
    description: "Join the conversation and see what others are building.",
  },
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
