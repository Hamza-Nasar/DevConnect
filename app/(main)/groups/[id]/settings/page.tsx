"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Users,
  Shield,
  Lock,
  Globe,
  Save,
  Upload,
  Trash2,
  UserX,
  Crown,
  Ban,
  MessageSquare,
  Bell,
  Eye,
  EyeOff,
  Edit3,
  Camera,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";

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
    isBanned?: boolean;
  }[];
  settings?: {
    allowMemberPosts: boolean;
    requireApproval: boolean;
    maxMembers?: number;
    isVisible: boolean;
  };
}

interface PendingRequest {
  id: string;
  userId: string;
  user: {
    id: string;
    name?: string;
    avatar?: string;
  };
  reason: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}

export default function GroupSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings form state
  const [settings, setSettings] = useState({
    name: "",
    description: "",
    category: "",
    isPrivate: false,
    allowMemberPosts: true,
    requireApproval: false,
    maxMembers: "",
    isVisible: true,
  });

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    memberId: string;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (groupId && groupId !== 'undefined' && session?.user?.id) {
      fetchGroup();
      fetchPendingRequests();
    } else if (params && !groupId) {
      console.log('Waiting for groupId in settings...', params);
    }
  }, [groupId, params, session?.user?.id]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        const groupData = data.group;

        // Check if user is admin
        if (!groupData.isAdmin) {
          toast.error("You don't have permission to access settings");
          router.push(`/groups/${groupId}`);
          return;
        }

        setGroup(groupData);
        setSettings({
          name: groupData.name,
          description: groupData.description,
          category: groupData.category,
          isPrivate: groupData.isPrivate,
          allowMemberPosts: groupData.settings?.allowMemberPosts ?? true,
          requireApproval: groupData.settings?.requireApproval ?? false,
          maxMembers: groupData.settings?.maxMembers?.toString() || "",
          isVisible: groupData.settings?.isVisible ?? true,
        });
      } else {
        toast.error("Failed to load group");
        router.push("/groups");
      }
    } catch (error) {
      console.error("Error fetching group:", error);
      toast.error("Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/requests`);
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const handleSaveSettings = async () => {
    if (!group) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          category: settings.category,
          isPrivate: settings.isPrivate,
          settings: {
            allowMemberPosts: settings.allowMemberPosts,
            requireApproval: settings.requireApproval,
            maxMembers: settings.maxMembers ? parseInt(settings.maxMembers) : null,
            isVisible: settings.isVisible,
          },
        }),
      });

      if (res.ok) {
        toast.success("Settings saved successfully!");
        fetchGroup(); // Refresh group data
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleMemberAction = async (memberId: string, action: string, newRole?: string) => {
    try {
      let res;
      switch (action) {
        case "promote":
          res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          });
          break;
        case "demote":
          res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "member" }),
          });
          break;
        case "remove":
          res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
            method: "DELETE",
          });
          break;
        case "ban":
          res = await fetch(`/api/groups/${groupId}/members/${memberId}/ban`, {
            method: "POST",
          });
          break;
      }

      if (res?.ok) {
        toast.success(`Member ${action}d successfully`);
        fetchGroup();
        setShowMemberModal(false);
        setShowConfirmModal(false);
      } else {
        toast.error(`Failed to ${action} member`);
      }
    } catch (error) {
      console.error(`Error ${action}ing member:`, error);
      toast.error(`Failed to ${action} member`);
    }
  };

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/groups/${groupId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast.success(`Request ${action}d successfully`);
        fetchPendingRequests();
        fetchGroup(); // Refresh member count
      } else {
        toast.error(`Failed to ${action} request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(`Failed to ${action} request`);
    }
  };

  const handleImageUpload = async (file: File, type: "avatar" | "cover") => {
    if (!group) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const res = await fetch(`/api/groups/${groupId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${type === "avatar" ? "Avatar" : "Cover image"} updated!`);

        // Update local state
        setGroup(prev => prev ? {
          ...prev,
          [type === "avatar" ? "avatar" : "coverImage"]: data.url
        } : null);
      } else {
        toast.error(`Failed to upload ${type}`);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (!group || !group.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center text-gray-400">
            <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Access Denied</p>
            <p className="text-sm mb-4">You don't have permission to access group settings</p>
            <Button onClick={() => router.push(`/groups/${groupId}`)} className="mt-4">
              Back to Group
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/groups/${groupId}`)}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Group
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={group.avatar || "/default-group-avatar.png"}
                  alt={group.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "avatar");
                    }}
                  />
                  <Camera className="h-4 w-4 text-white" />
                </label>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                  Group Settings
                </h1>
                <p className="text-gray-400">Manage {group.name} settings and members</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card variant="elevated" className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-blue-400" />
                    Basic Information
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Group Name
                      </label>
                      <Input
                        value={settings.name}
                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                        className="bg-gray-800/50 border-gray-700"
                        placeholder="Enter group name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={settings.description}
                        onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white min-h-[100px]"
                        placeholder="Describe your group..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={settings.category}
                          onChange={(e) => setSettings({ ...settings, category: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                        >
                          <option value="general">General</option>
                          <option value="technology">Technology</option>
                          <option value="programming">Programming</option>
                          <option value="design">Design</option>
                          <option value="business">Business</option>
                          <option value="education">Education</option>
                          <option value="gaming">Gaming</option>
                          <option value="music">Music</option>
                          <option value="sports">Sports</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Max Members (Optional)
                        </label>
                        <Input
                          type="number"
                          value={settings.maxMembers}
                          onChange={(e) => setSettings({ ...settings, maxMembers: e.target.value })}
                          className="bg-gray-800/50 border-gray-700"
                          placeholder="Unlimited"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Cover Image
                        </label>
                        <p className="text-xs text-gray-400">Upload a cover image for your group</p>
                      </div>
                      <div className="flex gap-2">
                        {group.coverImage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(group.coverImage, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, "cover");
                            }}
                          />
                          <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Privacy & Permissions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card variant="elevated" className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    Privacy & Permissions
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Private Group
                        </label>
                        <p className="text-xs text-gray-400">Only approved members can join and view content</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.isPrivate}
                        onChange={(e) => setSettings({ ...settings, isPrivate: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Visible in Search
                        </label>
                        <p className="text-xs text-gray-400">Allow this group to appear in search results</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.isVisible}
                        onChange={(e) => setSettings({ ...settings, isVisible: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Allow Member Posts
                        </label>
                        <p className="text-xs text-gray-400">Members can create posts in this group</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.allowMemberPosts}
                        onChange={(e) => setSettings({ ...settings, allowMemberPosts: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Require Post Approval
                        </label>
                        <p className="text-xs text-gray-400">Posts need admin approval before being published</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.requireApproval}
                        onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Save Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card variant="elevated" className="p-6">
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
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
                      <span className="text-gray-400">Pending Requests</span>
                      <span className="font-semibold text-yellow-400">{pendingRequests.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Privacy</span>
                      <Badge variant={group.isPrivate ? "default" : "info"}>
                        {group.isPrivate ? "Private" : "Public"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Member Management */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card variant="elevated" className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Member Management
                  </h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowMemberModal(true)}
                    >
                      <Users className="h-4 w-4 mr-3" />
                      Manage Members ({group.membersCount})
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowRequestsModal(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-3" />
                      Join Requests ({pendingRequests.length})
                    </Button>
                  </div>
                </Card>
              </motion.div>

              {/* Danger Zone */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card variant="elevated" className="p-6 border-red-500/20">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    These actions cannot be undone. Please be certain.
                  </p>
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
                        // Handle group deletion
                        toast.error("Group deletion not implemented yet");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </Button>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Members Management Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title="Manage Members"
        size="lg"
      >
        <div className="max-h-96 overflow-y-auto space-y-3">
          {group.members?.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <RealTimeAvatar
                  userId={member.id}
                  src={member.avatar}
                  alt={member.name || "Member"}
                  size="sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{member.name || "Anonymous"}</span>
                    <Badge variant={
                      member.role === "admin" ? "success" :
                      member.role === "moderator" ? "warning" : "outline"
                    } className="text-xs">
                      {member.role === "admin" && <Crown className="h-3 w-3 mr-1" />}
                      {member.role === "moderator" && <Shield className="h-3 w-3 mr-1" />}
                      {member.role}
                    </Badge>
                    {member.isBanned && (
                      <Badge variant="danger" className="text-xs">
                        <Ban className="h-3 w-3 mr-1" />
                        Banned
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Joined: {new Date(member.joinedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-1">
                {member.role !== "admin" && (
                  <>
                    {member.role === "member" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setConfirmAction({
                            type: "promote",
                            memberId: member.id,
                            action: () => handleMemberAction(member.id, "promote", "moderator")
                          });
                          setShowConfirmModal(true);
                        }}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setConfirmAction({
                            type: "demote",
                            memberId: member.id,
                            action: () => handleMemberAction(member.id, "demote")
                          });
                          setShowConfirmModal(true);
                        }}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setConfirmAction({
                          type: "remove",
                          memberId: member.id,
                          action: () => handleMemberAction(member.id, "remove")
                        });
                        setShowConfirmModal(true);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </Modal>

      {/* Join Requests Modal */}
      <Modal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        title="Join Requests"
        size="lg"
      >
        <div className="max-h-96 overflow-y-auto space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <RealTimeAvatar
                    userId={request.user.id}
                    src={request.user.avatar}
                    alt={request.user.name || "User"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">{request.user.name || "Anonymous"}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {request.reason && (
                      <p className="text-sm text-gray-300 mb-3">"{request.reason}"</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRequestAction(request.id, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestAction(request.id, "reject")}
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Action"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to {confirmAction?.type} {selectedMember?.name}?
            {confirmAction?.type === "remove" && " This action cannot be undone."}
            {confirmAction?.type === "promote" && " This will give them moderator privileges."}
            {confirmAction?.type === "demote" && " This will remove their moderator privileges."}
          </p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                confirmAction?.action();
                setShowConfirmModal(false);
              }}
            >
              Confirm
            </Button>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
