"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Search, 
  MessageCircle, 
  Users, 
  Calendar, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: Home, label: "Feed", path: "/feed" },
  { icon: Search, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Messages", path: "/chat" },
  { icon: Users, label: "Groups", path: "/groups" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function LeftSidebar() {
  const pathname = usePathname();

  return (
    <nav className="p-4 space-y-1">
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        
        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                : "text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}






