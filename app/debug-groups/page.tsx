"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function DebugGroupsPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/groups");
      const data = await res.json();

      if (res.ok) {
        setGroups(data.groups || []);
      } else {
        setError(data.error || "Failed to fetch groups");
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createTestGroup = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Group " + Date.now(),
          description: "This is a test group created for debugging",
          category: "general",
          isPrivate: false
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("Test group created successfully!");
        fetchGroups(); // Refresh the list
      } else {
        alert("Failed to create group: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network error while creating group");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (status === "loading") {
    return <div>Loading session...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please login first</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Groups Debug Page</h1>

      <div className="mb-4">
        <p><strong>Session Status:</strong> {status}</p>
        <p><strong>User ID:</strong> {session?.user?.id}</p>
        <p><strong>User Email:</strong> {session?.user?.email}</p>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={fetchGroups}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Refresh Groups
        </button>

        <button
          onClick={createTestGroup}
          disabled={creating}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Test Group"}
        </button>
      </div>

      {loading && <div>Loading groups...</div>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Groups ({groups.length})</h2>

        {groups.length === 0 && !loading && (
          <div className="text-gray-500">No groups found</div>
        )}

        {groups.map((group) => (
          <div key={group.id || group._id} className="border border-gray-300 rounded p-4">
            <h3 className="font-bold">{group.name}</h3>
            <p className="text-sm text-gray-600">{group.description}</p>
            <div className="mt-2 text-xs">
              <p>ID: {group.id || group._id}</p>
              <p>Members: {group.membersCount}</p>
              <p>Admin: {group.adminId}</p>
              <p>Is Member: {group.isMember ? "Yes" : "No"}</p>
              <p>Is Admin: {group.isAdmin ? "Yes" : "No"}</p>
            </div>
            <div className="mt-2">
              <a
                href={`/groups/${group._id}`}
                target="_blank"
                className="text-blue-500 underline text-sm"
              >
                View Group →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
