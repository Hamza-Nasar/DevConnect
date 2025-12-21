"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/navbar/Navbar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  showLeftSidebar?: boolean;
  showRightPanel?: boolean;
  leftSidebarContent?: ReactNode;
  rightPanelContent?: ReactNode;
}

export function AppShell({
  children,
  showLeftSidebar = true,
  showRightPanel = true,
  leftSidebarContent,
  rightPanelContent,
}: AppShellProps) {
  const { data: session } = useSession();

  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      <Navbar />

      <div className="flex pt-16">
        {/* Left Sidebar - Fixed Width */}
        {showLeftSidebar && (
          <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))]">
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              {leftSidebarContent}
            </div>
          </aside>
        )}

        {/* Center Content - Strict Max Width */}
        <main className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Right Panel - Secondary Only */}
        {showRightPanel && (
          <aside className="hidden xl:block w-80 flex-shrink-0 border-l border-[rgb(var(--border))] bg-[rgb(var(--card))]">
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-6">
              {rightPanelContent}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}






