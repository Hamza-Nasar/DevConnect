"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  Users,
  ArrowLeft,
  Settings,
  UserPlus,
  UserMinus,
  MessageCircle,
  Calendar,
  Crown,
  Shield,
  Lock,
  Globe,
  Plus,
  Heart,
  Share2,
  Flag,
  MoreVertical,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  Image,
  Video,
  Download,
  Star,
  Award,
  TrendingUp,
  BookOpen,
  Bell,
  BellOff,
  Pin,
  Hash,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { formatNumber, formatTimeAgo } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import getSocket from "@/lib/socket";

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
  members?: {
    id: string;
    name?: string;
    avatar?: string;
    role: "admin" | "moderator" | "member";
    joinedAt: string;
  }[];
  posts?: {
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      name?: string;
      avatar?: string;
    };
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
  }[];
}

export default function GroupViewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  // Debug logging
  console.log('GroupViewPage render - params:', params, 'groupId:', groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'about' | 'events' | 'files'>('posts');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [joinReason, setJoinReason] = useState("");

  useEffect(() => {
    console.log('Group page auth status:', status, 'user:', session?.user?.id);
    if (status === "unauthenticated") {
      console.log('Redirecting to login from group page');
      router.push("/login");
    }
  }, [status, router, session?.user?.id]);

  useEffect(() => {
    if (groupId && groupId !== 'undefined') {
      console.log('Valid groupId found:', groupId);
      fetchGroup();
    } else if (params && !groupId) {
      // If params exist but groupId is not available yet, wait for it
      console.log('Waiting for groupId...', params);
    } else if (!params) {
      console.log('Params not available yet');
    }
  }, [groupId, params]);

  // Real-time updates for group
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !groupId || !session?.user?.id) return;

    let isMounted = true;

    const handleMemberJoined = (data: { groupId: string; member: any; membersCount: number }) => {
      if (!isMounted || data.groupId !== groupId) return;
      console.log('👥 [Group] New member joined:', data.member);

      setGroup(prev => prev ? {
        ...prev,
        membersCount: data.membersCount,
        members: prev.members ? [...prev.members, data.member] : [data.member],
        isMember: prev.isMember || (data.member.id === session?.user?.id)
      } : null);

      toast.success(`${data.member.name || 'Someone'} joined the group!`);
    };

    const handleMemberLeft = (data: { groupId: string; memberId: string; membersCount: number }) => {
      if (!isMounted || data.groupId !== groupId) return;
      console.log('👥 [Group] Member left:', data.memberId);

      setGroup(prev => prev ? {
        ...prev,
        membersCount: data.membersCount,
        members: prev.members ? prev.members.filter(m => m.id !== data.memberId) : [],
        isMember: prev.isMember && (data.memberId !== session?.user?.id)
      } : null);

      toast('A member left the group');
    };

    const handleNewPost = (data: { groupId: string; post: any; postsCount: number }) => {
      if (!isMounted || data.groupId !== groupId) return;
      console.log('📝 [Group] New post:', data.post.title);

      setGroup(prev => prev ? {
        ...prev,
        postsCount: data.postsCount,
        posts: prev.posts ? [data.post, ...prev.posts] : [data.post]
      } : null);

      toast.success('New post in the group!');
    };

    const handlePostLiked = (data: { postId: string; likesCount: number; userId: string }) => {
      if (!isMounted) return;

      setGroup(prev => prev ? {
        ...prev,
        posts: prev.posts?.map(post =>
          post.id === data.postId
            ? {
                ...post,
                likesCount: data.likesCount,
                isLiked: data.userId === session?.user?.id ? !post.isLiked : post.isLiked
              }
            : post
        )
      } : null);
    };

    const handleJoinRequest = (data: { groupId: string; request: any }) => {
      if (!isMounted || data.groupId !== groupId) return;
      console.log('📋 [Group] New join request');

      toast('New join request received');
    };

    const handleGroupUpdated = (data: { groupId: string; updates: any }) => {
      if (!isMounted || data.groupId !== groupId) return;
      console.log('🔄 [Group] Group updated:', data.updates);

      setGroup(prev => prev ? { ...prev, ...data.updates } : null);
      toast.success('Group settings updated');
    };

    const handleGroupShared = (data: { groupId: string; userId: string; groupName: string }) => {
      if (!isMounted || data.groupId !== groupId) return;
      console.log('🔗 [Group] Group shared:', data.groupName);

      toast.success('Group link shared!');
    };

    const handleGroupReported = (data: { groupId: string; userId: string; groupName: string }) => {
      if (!isMounted || data.groupId !== groupId) return;
      console.log('🚨 [Group] Group reported:', data.groupName);

      toast('Thank you for your report. We will review it shortly.');
    };

    // Join group room for real-time updates
    const joinTimeout = setTimeout(() => {
      if (isMounted) {
        console.log('🔌 [Group] Joining group room:', groupId);
        socket.emit("join_group", groupId);
      }
    }, 200);

    socket.on("group_member_joined", handleMemberJoined);
    socket.on("group_member_left", handleMemberLeft);
    socket.on("group_new_post", handleNewPost);
    socket.on("post_liked", handlePostLiked);
    socket.on("group_join_request", handleJoinRequest);
    socket.on("group_updated", handleGroupUpdated);
    socket.on("group_shared", handleGroupShared);
    socket.on("group_reported", handleGroupReported);

    return () => {
      isMounted = false;
      clearTimeout(joinTimeout);
      socket.off("group_member_joined", handleMemberJoined);
      socket.off("group_member_left", handleMemberLeft);
      socket.off("group_new_post", handleNewPost);
      socket.off("post_liked", handlePostLiked);
      socket.off("group_join_request", handleJoinRequest);
      socket.off("group_updated", handleGroupUpdated);
      socket.off("group_shared", handleGroupShared);
      socket.off("group_reported", handleGroupReported);
      socket.emit("leave_group", groupId);
    };
  }, [groupId, session?.user?.id]);

  const fetchGroup = async () => {
    if (!groupId || groupId === 'undefined') {
      console.error('Invalid groupId:', groupId);
      setLoading(false);
      return;
    }

    console.log('Fetching group with ID:', groupId, 'Session:', session?.user?.id);

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
      } else {
        const errorData = await res.json().catch(() => ({}));

        if (res.status === 404) {
          toast.error("Group not found");
          router.push("/groups");
        } else if (res.status === 403) {
          toast.error("You don't have permission to view this group");
          router.push("/groups");
        } else {
          toast.error(`Failed to load group: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error("Error fetching group:", error);
      toast.error("Failed to load group - Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!group || !groupId || groupId === 'undefined') {
      console.error('Cannot join group: invalid groupId', groupId);
      toast.error('Invalid group ID');
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: joinReason }),
      });

      if (res.ok) {
        toast.success("Join request sent!");
        setShowJoinModal(false);
        setJoinReason("");
        fetchGroup(); // Refresh group data
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to send join request");
      }
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Failed to send join request");
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !confirm("Are you sure you want to leave this group?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Left group successfully");
        fetchGroup(); // Refresh group data
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Failed to leave group");
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });

      if (res.ok) {
        // Update local state
        setGroup(prev => prev ? {
          ...prev,
          posts: prev.posts?.map(post =>
            post.id === postId
              ? {
                  ...post,
                  isLiked: !post.isLiked,
                  likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
                }
              : post
          )
        } : null);
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleShareGroup = async () => {
    if (!group) return;

    try {
      // Copy group link to clipboard
      const groupUrl = `${window.location.origin}/groups/${groupId}`;
      await navigator.clipboard.writeText(groupUrl);

      toast.success("Group link copied to clipboard!");

      // Emit real-time share event
      const socket = getSocket();
      if (socket) {
        socket.emit("share_group", {
          groupId,
          userId: session?.user?.id,
          groupName: group.name
        });
      }
    } catch (error) {
      console.error("Error sharing group:", error);
      toast.error("Failed to share group");
    }
  };

  const handleReportGroup = async () => {
    if (!group) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Inappropriate content",
          description: "Reported via group page"
        })
      });

      if (res.ok) {
        toast.success("Group reported successfully");

        // Emit real-time report event
        const socket = getSocket();
        if (socket) {
          socket.emit("report_group", {
            groupId,
            userId: session?.user?.id,
            groupName: group.name
          });
        }
      } else {
        toast.error("Failed to report group");
      }
    } catch (error) {
      console.error("Error reporting group:", error);
      toast.error("Failed to report group");
    }
  };

  if (status === "loading" || loading || !groupId || groupId === 'undefined') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          {!groupId || groupId === 'undefined' ? (
            <div className="text-center text-gray-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p>Loading group...</p>
            </div>
          ) : (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          )}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center text-gray-400">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Group not found</p>
            <Button onClick={() => router.push("/groups")} className="mt-4">
              Back to Groups
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isMember = group.isMember;
  const isAdmin = group.isAdmin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Back Button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/groups")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </div>

          {/* Group Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card variant="elevated" className="overflow-hidden">
              {/* Cover Image */}
              <div className="h-48 sm:h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative">
                {group.coverImage && (
                  <img
                    src={group.coverImage}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-black/30" />

                {/* Group Actions - Top Right */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/20 hover:bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowMembersModal(true)}
                  >
                    <Users className="h-5 w-5 text-white" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/20 hover:bg-black/40 backdrop-blur-sm"
                      onClick={() => router.push(`/groups/${groupId}/settings`)}
                    >
                      <Settings className="h-5 w-5 text-white" />
                    </Button>
                  )}
                </div>

                {/* Group Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-end gap-4">
                    <div className="relative">
                      <Avatar
                        src={group.avatar}
                        alt={group.name}
                        size="xl"
                        className="ring-4 ring-white/20"
                      />
                      {group.isPrivate && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center ring-4 ring-gray-900">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                          {group.name}
                        </h1>
                        {group.isPrivate ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="info" className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Public
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {formatNumber(group.membersCount)} members
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {formatNumber(group.postsCount)} posts
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created {formatTimeAgo(group.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Actions */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {groupId && groupId !== 'undefined' ? (
                    isMember ? (
                      <>
                        <Button
                          variant="primary"
                          className="flex-1 sm:flex-initial"
                          onClick={() => router.push(`/create-post?group=${groupId}`)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Post
                        </Button>
                        {!isAdmin && (
                          <Button
                            variant="outline"
                            onClick={handleLeaveGroup}
                            className="flex-1 sm:flex-initial"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Leave Group
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => group.isPrivate ? setShowJoinModal(true) : handleJoinGroup()}
                        className="flex-1 sm:flex-initial"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {group.isPrivate ? "Request to Join" : "Join Group"}
                      </Button>
                    )
                  ) : (
                    <Button variant="primary" disabled className="flex-1 sm:flex-initial">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Loading...
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShareGroup}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleReportGroup}
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Tabs - Only for members */}
          {isMember && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <Card variant="elevated" className="p-2">
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'posts', label: 'Posts', icon: MessageCircle, count: group.postsCount },
                    { id: 'members', label: 'Members', icon: Users, count: group.membersCount },
                    { id: 'about', label: 'About', icon: BookOpen },
                    { id: 'events', label: 'Events', icon: Calendar },
                    { id: 'files', label: 'Files', icon: FileText },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <Badge variant={isActive ? "primary" : "outline"} className="text-xs px-1.5 py-0.5">
                            {formatNumber(tab.count)}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Posts Tab */}
              {activeTab === 'posts' && (
                <>
                  {/* Group Description - Only for non-members */}
                  {!isMember && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card variant="elevated" className="p-6">
                        <h2 className="text-xl font-bold text-white mb-4">About</h2>
                        <p className="text-gray-300 mb-4">{group.description}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Crown className="h-4 w-4 text-yellow-400" />
                            Admin: {group.admin.name || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {group.category}
                            </Badge>
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  )}

              {/* Recent Posts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card variant="elevated" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Recent Posts</h2>
                    {isMember && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/create-post?group=${groupId}`)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Post
                      </Button>
                    )}
                  </div>

                  {group.posts && group.posts.length > 0 ? (
                    <div className="space-y-4">
                      {group.posts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <RealTimeAvatar
                              userId={post.author.id}
                              src={post.author.avatar}
                              alt={post.author.name || "User"}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-white truncate">
                                  {post.author.name || "Anonymous"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTimeAgo(post.createdAt)}
                                </span>
                              </div>
                              <h3 className="font-medium text-white mb-2">{post.title}</h3>
                              <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLikePost(post.id)}
                                  className={post.isLiked ? "text-red-400" : "text-gray-400"}
                                >
                                  <Heart className={`h-4 w-4 mr-1 ${post.isLiked ? "fill-current" : ""}`} />
                                  {post.likesCount}
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-400">
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  {post.commentsCount}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No posts yet</p>
                      <p className="text-sm mb-4">Be the first to share something!</p>
                      {isMember && (
                        <Button
                          variant="primary"
                          onClick={() => router.push(`/create-post?group=${groupId}`)}
                        >
                          Create First Post
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
              </>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && isMember && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card variant="elevated" className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-400" />
                        Group Members ({formatNumber(group.membersCount)})
                      </h2>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/groups/${groupId}/settings`)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {group.members?.map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <RealTimeAvatar
                              userId={member.id}
                              src={member.avatar}
                              alt={member.name || "Member"}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{member.name || "Anonymous"}</span>
                                <Badge variant={
                                  member.role === "admin" ? "success" :
                                  member.role === "moderator" ? "warning" : "outline"
                                } className="text-xs">
                                  {member.role === "admin" && <Crown className="h-3 w-3 mr-1" />}
                                  {member.role === "moderator" && <Shield className="h-3 w-3 mr-1" />}
                                  {member.role}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400">
                                Joined {formatTimeAgo(member.joinedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            {isAdmin && member.role !== "admin" && (
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* About Tab */}
              {activeTab === 'about' && isMember && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-6"
                >
                  {/* Group Description */}
                  <Card variant="elevated" className="p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-400" />
                      About This Group
                    </h2>
                    <p className="text-gray-300 mb-6">{group.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Crown className="h-5 w-5 text-yellow-400" />
                          <div>
                            <p className="text-sm font-medium text-white">Admin</p>
                            <p className="text-xs text-gray-400">{group.admin.name || "Unknown"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Hash className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-sm font-medium text-white">Category</p>
                            <p className="text-xs text-gray-400">{group.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-purple-400" />
                          <div>
                            <p className="text-sm font-medium text-white">Created</p>
                            <p className="text-xs text-gray-400">{formatTimeAgo(group.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {group.isPrivate ? (
                            <Lock className="h-5 w-5 text-red-400" />
                          ) : (
                            <Globe className="h-5 w-5 text-green-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">Privacy</p>
                            <p className="text-xs text-gray-400">
                              {group.isPrivate ? "Private Group" : "Public Group"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-cyan-400" />
                          <div>
                            <p className="text-sm font-medium text-white">Members</p>
                            <p className="text-xs text-gray-400">{formatNumber(group.membersCount)} members</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5 text-orange-400" />
                          <div>
                            <p className="text-sm font-medium text-white">Activity</p>
                            <p className="text-xs text-gray-400">{formatNumber(group.postsCount)} posts</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Group Rules */}
                  <Card variant="elevated" className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-400" />
                      Group Rules
                    </h3>
                    <div className="space-y-3 text-sm text-gray-300">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <p>Be respectful and considerate towards all members</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <p>Keep discussions relevant to the group topic</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <p>No spam, advertising, or self-promotion</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <p>Report inappropriate content to moderators</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Events Tab */}
              {activeTab === 'events' && isMember && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card variant="elevated" className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-400" />
                        Group Events
                      </h2>
                      {isAdmin && (
                        <Button variant="primary">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Event
                        </Button>
                      )}
                    </div>

                    <div className="text-center py-12 text-gray-400">
                      <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-xl font-medium mb-2">No upcoming events</p>
                      <p className="text-sm mb-4">Events will be announced here when scheduled</p>
                      {isAdmin && (
                        <Button variant="outline">
                          Schedule First Event
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && isMember && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card variant="elevated" className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-400" />
                        Shared Files
                      </h2>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </div>

                    <div className="text-center py-12 text-gray-400">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-xl font-medium mb-2">No files shared yet</p>
                      <p className="text-sm mb-4">Share documents, images, and other files with the group</p>
                      <Button variant="outline">
                        Upload First File
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Non-member content */}
              {!isMember && activeTab === 'posts' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card variant="elevated" className="p-8 text-center">
                    <Lock className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                    <h3 className="text-xl font-bold text-white mb-2">Join to Access Content</h3>
                    <p className="text-gray-400 mb-6">
                      Become a member to view posts, participate in discussions, and access all group features.
                    </p>
                    {groupId && groupId !== 'undefined' ? (
                      <Button
                        onClick={group.isPrivate ? () => setShowJoinModal(true) : handleJoinGroup}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {group.isPrivate ? "Request to Join" : "Join Group"}
                      </Button>
                    ) : (
                      <Button disabled className="bg-gray-600">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Loading...
                      </Button>
                    )}
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Group Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card variant="elevated" className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Group Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Members</span>
                      <span className="font-semibold text-white">{formatNumber(group.membersCount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Posts</span>
                      <span className="font-semibold text-white">{formatNumber(group.postsCount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Category</span>
                      <Badge variant="outline">{group.category}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Created</span>
                      <span className="text-sm text-gray-300">{formatTimeAgo(group.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card variant="elevated" className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setShowMembersModal(true)}
                    >
                      <Users className="h-4 w-4 mr-3" />
                      View Members
                    </Button>
                    {isMember && (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => router.push(`/create-post?group=${groupId}`)}
                        >
                          <Plus className="h-4 w-4 mr-3" />
                          Create Post
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => router.push(`/groups/${groupId}/settings`)}
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Group Settings
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Group Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title={`Join ${group.name}`}
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            This is a private group. Please provide a reason for wanting to join:
          </p>
          <textarea
            value={joinReason}
            onChange={(e) => setJoinReason(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white min-h-[100px]"
            placeholder="Tell us why you want to join this group..."
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleJoinGroup} className="flex-1">
              Send Join Request
            </Button>
            <Button variant="outline" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Members Modal */}
      <Modal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        title={`${group.name} Members`}
        size="lg"
      >
        <div className="max-h-96 overflow-y-auto">
          {group.members && group.members.length > 0 ? (
            <div className="space-y-3">
              {group.members.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50"
                >
                  <RealTimeAvatar
                    userId={member.id}
                    src={member.avatar}
                    alt={member.name || "Member"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {member.name || "Anonymous"}
                      </span>
                      {member.role === "admin" && (
                        <Badge variant="success" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {member.role === "moderator" && (
                        <Badge variant="warning" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Moderator
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Joined {formatTimeAgo(member.joinedAt)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No members found</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
