import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Groups | DevConnect",
  description: "Find your community! Join groups to talk about programming, design, gaming, and technology with people who share your interests.",
  openGraph: {
    title: "Groups | DevConnect",
    description: "Join groups and make new tech friends.",
  },
};

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
