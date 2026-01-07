"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Settings,
  UserPlus,
  UserMinus,
  Lock,
  Globe,
  Calendar,
  MessageCircle,
  TrendingUp,
  Crown,
  Shield,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface Group {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  membersCount: number;
  postsCount: number;
  isPrivate: boolean;
  isMember: boolean;
  isAdmin: boolean;
  category: string;
  createdAt: string;
  admin: {
    id: string;
    name?: string;
    avatar?: string;
  };
}

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    category: "general",
    isPrivate: false,
  });

  const categories = [
    "all",
    "general",
    "technology",
    "programming",
    "design",
    "business",
    "education",
    "gaming",
    "music",
    "sports",
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchGroups();
  }, [selectedCategory]);

  const fetchGroups = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (searchQuery) params.append("q", searchQuery);

      const res = await fetch(`/api/groups?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGroup),
      });

      if (res.ok) {
        toast.success("Group created successfully!");
        setShowCreateModal(false);
        setNewGroup({ name: "", description: "", category: "general", isPrivate: false });
        fetchGroups();
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Joined group!");
        fetchGroups();
      }
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Failed to join group");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Left group");
        fetchGroups();
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Failed to leave group");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                  Groups
                </h1>
                <p className="text-sm sm:text-base text-gray-400">Join communities and connect with like-minded people</p>
              </div>
              <Button variant="primary" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto text-sm sm:text-base">
                <Plus className="h-4 w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Create Group</span>
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white w-full sm:w-auto"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredGroups.length === 0 ? (
              <Card variant="default" className="p-12 text-center col-span-full">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                <p className="text-gray-400">No groups found</p>
              </Card>
            ) : (
              filteredGroups.map((group, index) => (
                <motion.div
                  key={`${group.id}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card variant="elevated" hover className="overflow-hidden">
                    {/* Cover Image */}
                    {group.coverImage ? (
                      <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 relative">
                        <img
                          src={group.coverImage}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600" />
                    )}

                    <div className="p-4 sm:p-6">
                      {/* Avatar and Name */}
                      <div className="flex items-start gap-3 sm:gap-4 mb-4">
                        <div className="relative -mt-12 flex-shrink-0">
                          <Avatar
                            src={group.avatar}
                            alt={group.name}
                            size="xl"
                          />
                          {group.isPrivate && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gray-900 rounded-full flex items-center justify-center border-2 border-gray-800">
                              <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 mt-2 min-w-0">
                          <h3 className="font-bold text-white text-base sm:text-lg mb-1 truncate">{group.name}</h3>
                          <div className="flex items-center flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {group.category}
                            </Badge>
                            {group.isPrivate ? (
                              <Badge variant="default" className="text-xs flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Private
                              </Badge>
                            ) : (
                              <Badge variant="info" className="text-xs flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Public
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {group.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {formatNumber(group.membersCount)} members
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {formatNumber(group.postsCount)} posts
                        </span>
                      </div>

                      {/* Admin */}
                      <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                        <Crown className="h-4 w-4 text-yellow-400" />
                        <span>Admin: {group.admin.name || "Unknown"}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {group.isMember ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => router.push(`/groups/${group.id}`)}
                            >
                              View Group
                            </Button>
                            <div className="flex items-center gap-2">
                              {!group.isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLeaveGroup(group.id)}
                                  className="flex-1 sm:flex-initial"
                                >
                                  <UserMinus className="h-4 w-4 sm:mr-0" />
                                  <span className="sm:hidden ml-2">Leave</span>
                                </Button>
                              )}
                              {group.isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/groups/${group.id}/settings`)}
                                  className="flex-1 sm:flex-initial"
                                >
                                  <Settings className="h-4 w-4 sm:mr-0" />
                                  <span className="sm:hidden ml-2">Settings</span>
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleJoinGroup(group.id)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Join Group
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Group"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Group Name</label>
            <Input
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="bg-gray-800/50 border-gray-700"
              placeholder="Enter group name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white min-h-[100px]"
              placeholder="Describe your group..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={newGroup.category}
              onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
            >
              {categories.filter((c) => c !== "all").map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Private Group</label>
              <p className="text-xs text-gray-400">Only approved members can join</p>
            </div>
            <input
              type="checkbox"
              checked={newGroup.isPrivate}
              onChange={(e) => setNewGroup({ ...newGroup, isPrivate: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleCreateGroup} className="flex-1">
              Create Group
            </Button>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
