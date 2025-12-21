"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  UserMinus,
  Settings,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Award,
  Trophy,
  Star,
  TrendingUp,
  Code,
  Briefcase,
  GraduationCap,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Navbar from "@/components/navbar/Navbar";
import Link from "next/link";
import getSocket from "@/lib/socket";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface User {
  id: string;
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  image?: string;
  location?: string;
  website?: string;
  verified?: boolean;
  createdAt: string;
  skills?: string[];
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  badges?: string[];
  achievements?: string[];
}

interface Post {
  id: string;
  title?: string;
  content: string;
  images?: string[];
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
}

interface ProfileClientProps {
  user: User;
  posts: Post[];
  isOwnProfile: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export default function ProfileClient({
  user,
  posts,
  isOwnProfile,
  isFollowing: initialIsFollowing,
  followersCount: initialFollowersCount,
  followingCount: initialFollowingCount,
  postsCount,
}: ProfileClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [userAvatar, setUserAvatar] = useState(user.image || user.avatar);
  const [stats, setStats] = useState({
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalViews: 0,
  });

  // Real-time avatar updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user.id) return;

    socket.on("avatar_changed", (data: { userId: string; avatar: string }) => {
      if (data.userId === user.id) {
        setUserAvatar(data.avatar);
      }
    });

    return () => {
      socket.off("avatar_changed");
    };
  }, [user.id]);

  useEffect(() => {
    const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.sharesCount || 0), 0);
    const totalViews = posts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    setStats({ totalLikes, totalComments, totalShares, totalViews });
  }, [posts]);

  useEffect(() => {
    if (!isOwnProfile && session?.user && user.id) {
      // Record view
      fetch("/api/profile/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewedId: user.id }),
      }).catch(err => console.error("Error recording view", err));
    }
  }, [isOwnProfile, user.id, session]);

  const handleFollow = async () => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;

    setIsLoading(true);
    try {
      // API toggles follow status regardless of current state
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: user.id }),
      });

      if (res.ok) {
        const data = await res.json(); // { isFollowing, isRequested }
        setIsFollowing(data.isFollowing);

        // Update counts based on new state
        if (data.isFollowing) {
          setFollowersCount((prev) => prev + 1);
          toast.success("Following!");
          const socket = getSocket();
          if (socket) {
            socket.emit("follow_user", {
              followerId: userId,
              followingId: user.id,
            });
          }
        } else {
          setFollowersCount((prev) => Math.max(0, prev - 1));
          toast.success("Unfollowed");
          const socket = getSocket();
          if (socket) {
            socket.emit("unfollow_user", {
              followerId: userId,
              followingId: user.id
            });
          }
        }
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error);
      toast.error("Failed to update follow status");
    } finally {
      setIsLoading(false);
    }
  };

  const userName = user.name || "User";
  const badges = user.badges || [];
  const achievements = user.achievements || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card variant="elevated" className="p-8 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <RealTimeAvatar
                    userId={user.id}
                    src={userAvatar}
                    alt={userName}
                    size="xl"
                    status="offline"
                  />
                  {user.verified && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-4 border-gray-900">
                      <span className="text-white text-lg">✓</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{userName}</h1>
                    {user.verified && (
                      <Badge variant="success" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                    {isOwnProfile && (
                      <Link href="/settings">
                        <Button variant="ghost" size="icon">
                          <Settings className="h-5 w-5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                  <p className="text-gray-400 mb-4">@{user.username || user.id}</p>

                  {user.bio && (
                    <p className="text-gray-300 mb-4">{user.bio}</p>
                  )}

                  {/* Badges & Achievements */}
                  {(badges.length > 0 || achievements.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {badges.map((badge, idx) => (
                        <Badge key={idx} variant="primary" className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {badge}
                        </Badge>
                      ))}
                      {achievements.map((achievement, idx) => (
                        <Badge key={idx} variant="success" className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Location & Website */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                    {user.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.website && (
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-blue-400 transition"
                      >
                        <Globe className="h-4 w-4" />
                        <span>{user.website.replace(/^https?:\/\//, "")}</span>
                      </a>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  {user.skills && user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {user.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="flex items-center gap-1">
                          <Code className="h-3 w-3" />
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <Link href={`/profile/${user.username || user.id}/followers`} className="hover:opacity-80 transition">
                      <Card variant="default" className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">{formatNumber(followersCount)}</div>
                        <div className="text-sm text-gray-400">Followers</div>
                      </Card>
                    </Link>
                    <Link href={`/profile/${user.username || user.id}/following`} className="hover:opacity-80 transition">
                      <Card variant="default" className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">{formatNumber(followingCount)}</div>
                        <div className="text-sm text-gray-400">Following</div>
                      </Card>
                    </Link>
                    <Card variant="default" className="p-4 text-center">
                      <div className="text-2xl font-bold text-white">{formatNumber(postsCount)}</div>
                      <div className="text-sm text-gray-400">Posts</div>
                    </Card>
                    <Card variant="default" className="p-4 text-center">
                      <div className="text-2xl font-bold text-white">{formatNumber(stats.totalLikes)}</div>
                      <div className="text-sm text-gray-400">Likes</div>
                    </Card>
                  </div>

                  {/* Actions */}
                  {!isOwnProfile && session?.user?.id !== user.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleFollow}
                        disabled={isLoading}
                        variant={isFollowing ? "outline" : "primary"}
                        size="default"
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="default" onClick={() => router.push(`/chat?userId=${user.id}`)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="posts" className="mb-6">
            <TabsList className={`grid w-full ${isOwnProfile ? "grid-cols-5" : "grid-cols-4"}`}>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="viewers">
                  <Eye className="h-4 w-4 mr-2" />
                  Viewers
                </TabsTrigger>
              )}
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts" className="mt-6">
              {posts.length === 0 ? (
                <Card variant="default" className="p-12 text-center">
                  <p className="text-gray-400 text-lg">No posts yet</p>
                  <p className="text-gray-500 text-sm mt-2">Start sharing to see posts here</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Link href={`/feed?post=${post.id}`}>
                        <Card variant="elevated" hover className="overflow-hidden">
                          {post.images && post.images.length > 0 ? (
                            <div className="relative h-48 bg-gray-800">
                              <img
                                src={post.images[0]}
                                alt="Post"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                                <div className="flex items-center gap-4 text-white">
                                  <span className="flex items-center gap-1">
                                    <Heart className="h-4 w-4" />
                                    {formatNumber(post.likesCount || 0)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="h-4 w-4" />
                                    {formatNumber(post.commentsCount || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-48 bg-gray-800 flex items-center justify-center p-4">
                              <p className="text-gray-500 text-sm text-center line-clamp-3">
                                {post.content}
                              </p>
                            </div>
                          )}
                          <div className="p-3">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {formatNumber(post.likesCount || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {formatNumber(post.commentsCount || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Share2 className="h-3 w-3" />
                                {formatNumber(post.sharesCount || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(post.viewsCount || 0)}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">About</h3>
                <div className="space-y-4">
                  {user.bio && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Bio</h4>
                      <p className="text-gray-300">{user.bio}</p>
                    </div>
                  )}
                  {user.skills && user.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {user.location && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Location</h4>
                        <p className="text-gray-300 flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {user.location}
                        </p>
                      </div>
                    )}
                    {user.website && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Website</h4>
                        <a
                          href={user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <LinkIcon className="h-4 w-4" />
                          {user.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.length === 0 ? (
                  <Card variant="default" className="p-12 text-center col-span-full">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                    <p className="text-gray-400">No achievements yet</p>
                  </Card>
                ) : (
                  achievements.map((achievement, idx) => (
                    <Card key={idx} variant="elevated" className="p-6 text-center">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                      <h4 className="font-bold text-white mb-2">{achievement}</h4>
                      <p className="text-sm text-gray-400">Achievement unlocked!</p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Post reached 100 likes</p>
                      <p className="text-sm text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <UserPlus className="h-5 w-5 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Gained 10 new followers</p>
                      <p className="text-sm text-gray-400">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-white font-medium">Unlocked achievement: First Post</p>
                      <p className="text-sm text-gray-400">3 days ago</p>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Viewers Tab */}
            {isOwnProfile && (
              <TabsContent value="viewers" className="mt-6">
                <ViewersList />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ViewersList() {
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViewers = async () => {
      try {
        const res = await fetch("/api/profile/viewers");
        if (res.ok) {
          const data = await res.json();
          setViewers(data.viewers);
        }
      } catch (error) {
        console.error("Error fetching viewers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchViewers();
  }, []);

  if (loading) {
    return <div className="text-white text-center py-10">Loading viewers...</div>;
  }

  if (viewers.length === 0) {
    return (
      <Card variant="default" className="p-12 text-center">
        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
        <p className="text-gray-400">No profile views yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {viewers.map((view: any, idx: number) => (
        <Card key={idx} variant="elevated" className="p-4 flex items-center gap-4">
          <RealTimeAvatar
            userId={view.viewer.id}
            src={view.viewer.avatar}
            alt={view.viewer.name || "User"}
            size="md"
          />
          <div className="flex-1">
            <Link href={`/profile/${view.viewer.username || view.viewer.id}`} className="hover:underline">
              <h4 className="font-semibold text-white">{view.viewer.name}</h4>
            </Link>
            <p className="text-sm text-gray-400">@{view.viewer.username}</p>
          </div>
          <div className="text-right text-gray-500 text-xs">
            <p>Viewed on {new Date(view.viewedAt).toLocaleDateString()}</p>
            <p>{new Date(view.viewedAt).toLocaleTimeString()}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
