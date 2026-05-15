"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/navbar/Navbar";

interface QueueItem {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  user?: { name?: string; username?: string };
  urgency?: "low" | "medium" | "high";
  stackTags?: string[];
  status?: string;
}

export default function NeedHelpQueuePage() {
  const router = useRouter();
  const { status } = useSession();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQueue = async () => {
    try {
      const res = await fetch("/api/posts/need-help/queue", { cache: "no-store" });
      const data = await res.json();
      setQueue(data.queue || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    loadQueue();
    const timer = setInterval(loadQueue, 30000);
    return () => clearInterval(timer);
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="pt-20 px-4 lg:pl-80 pb-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Need Help Queue</h1>
            <button onClick={loadQueue} className="rounded-lg border border-gray-600 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800">Refresh</button>
          </div>

          {isLoading ? (
            <p className="text-gray-400">Loading queue...</p>
          ) : queue.length === 0 ? (
            <p className="text-gray-400">No open need-help posts right now.</p>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/feed?postId=${item.id}`)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-left hover:border-blue-500/50"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{item.title || "Untitled"}</p>
                    <span className="rounded-full bg-blue-500/20 px-2 py-1 text-[10px] uppercase text-blue-200">
                      {item.urgency || "medium"}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-300">{item.content}</p>
                  <p className="mt-2 text-[11px] text-gray-500">
                    {(item.stackTags || []).join(", ")} | {new Date(item.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
