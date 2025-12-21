"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function RightPanel() {
  const trendingTopics = [
    "#webdev",
    "#javascript",
    "#react",
    "#nextjs",
    "#typescript",
  ];

  const suggestedUsers = [
    { id: "1", name: "John Doe", username: "@johndoe", avatar: null },
    { id: "2", name: "Jane Smith", username: "@janesmith", avatar: null },
    { id: "3", name: "Mike Johnson", username: "@mikejohnson", avatar: null },
  ];

  return (
    <div className="space-y-6">
      {/* Trending Topics */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Trending Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {trendingTopics.map((topic) => (
            <button
              key={topic}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[rgb(var(--muted))] transition-colors text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
            >
              {topic}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Suggested Users */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Who to Follow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">{user.username}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Follow
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Insights / Analytics */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[rgb(var(--muted-foreground))]">Posts</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[rgb(var(--muted-foreground))]">Following</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[rgb(var(--muted-foreground))]">Followers</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}






