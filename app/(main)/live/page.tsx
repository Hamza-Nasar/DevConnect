"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Video,
  Radio,
  Users,
  MessageCircle,
  Heart,
  Share2,
  Settings,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Send,
  Gift,
  Crown,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatNumber } from "@/lib/utils";
import WebRTCLive from "@/components/live/WebRTCLive";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import getSocket from "@/lib/socket";

interface LiveStream {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  streamer: {
    id: string;
    name?: string;
    avatar?: string;
    verified?: boolean;
  };
  viewersCount: number;
  likesCount: number;
  category: string;
  isLive: boolean;
  startedAt: string;
}

interface LiveComment {
  id: string;
  user: {
    id: string;
    name?: string;
    avatar?: string;
  };
  message: string;
  timestamp: string;
  isGift?: boolean;
}

export default function LivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchLiveStreams();
  }, []);

  useEffect(() => {
    if (selectedStream && session?.user?.id) {
      fetchComments();
      fetchLiveStreams();
      
      const socket = getSocket();
      if (socket) {
        // Join live stream room
        socket.emit("join_live_stream", { streamId: selectedStream.id });
        
        // Listen for realtime updates
        socket.on("live_comment", (comment: LiveComment) => {
          if (comment && comment.id) {
            setComments((prev) => {
              if (prev.some(c => c.id === comment.id)) return prev;
              return [...prev, comment];
            });
          }
        });
        
        socket.on("live_like", (data: { streamId: string; likesCount: number }) => {
          if (data.streamId === selectedStream.id) {
            setSelectedStream((prev) => prev ? { ...prev, likesCount: data.likesCount } : null);
            setLiveStreams((prev) =>
              prev.map((s) => s.id === data.streamId ? { ...s, likesCount: data.likesCount } : s)
            );
          }
        });
        
        socket.on("live_viewers", (data: { streamId: string; viewersCount: number }) => {
          if (data.streamId === selectedStream.id) {
            setSelectedStream((prev) => prev ? { ...prev, viewersCount: data.viewersCount } : null);
            setLiveStreams((prev) =>
              prev.map((s) => s.id === data.streamId ? { ...s, viewersCount: data.viewersCount } : s)
            );
          }
        });
        
        socket.on("live_gift", (data: { streamId: string; gift: any }) => {
          if (data.streamId === selectedStream.id && data.gift) {
            // Add gift as a special comment
            setComments((prev) => {
              const giftComment: LiveComment = {
                id: `gift-${Date.now()}`,
                user: data.gift.user,
                message: `sent a ${data.gift.type} gift! 🎁`,
                timestamp: new Date().toISOString(),
                isGift: true,
              };
              if (prev.some(c => c.id === giftComment.id)) return prev;
              return [...prev, giftComment];
            });
          }
        });
      }
      
      return () => {
        if (socket) {
          socket.emit("leave_live_stream", { streamId: selectedStream.id });
          socket.off("live_comment");
          socket.off("live_like");
          socket.off("live_viewers");
          socket.off("live_gift");
        }
      };
    }
  }, [selectedStream, session?.user?.id]);

  const fetchLiveStreams = async () => {
    try {
      const res = await fetch("/api/live");
      if (res.ok) {
        const data = await res.json();
        setLiveStreams(data.streams || []);
      }
    } catch (error) {
      console.error("Error fetching live streams:", error);
    }
  };

  const fetchComments = async () => {
    if (!selectedStream) return;
    try {
      const res = await fetch(`/api/live/${selectedStream.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !selectedStream || !session?.user?.id) return;

    try {
      const res = await fetch(`/api/live/${selectedStream.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commentInput }),
      });

      if (res.ok) {
        const data = await res.json();
        setCommentInput("");
        
        // Emit socket event for realtime update
        const socket = getSocket();
        if (socket && data.comment) {
          socket.emit("live_comment", {
            streamId: selectedStream.id,
            comment: data.comment,
          });
        }
        
        // Also fetch to ensure consistency
        fetchComments();
      }
    } catch (error) {
      console.error("Error sending comment:", error);
      toast.error("Failed to send comment");
    }
  };

  const handleLike = async () => {
    if (!selectedStream || !session?.user?.id) return;
    try {
      const res = await fetch(`/api/live/${selectedStream.id}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        
        // Emit socket event for realtime update
        const socket = getSocket();
        if (socket) {
          socket.emit("live_like", {
            streamId: selectedStream.id,
            likesCount: data.likesCount || selectedStream.likesCount + 1,
          });
        }
        
        fetchLiveStreams();
      }
    } catch (error) {
      console.error("Error liking stream:", error);
      toast.error("Failed to like stream");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedStream ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Player */}
              <div className="lg:col-span-2">
                <Card variant="elevated" className="overflow-hidden">
                  <div className="relative bg-black aspect-video">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center mb-4 animate-pulse">
                          <Radio className="h-10 w-10 text-white" />
                        </div>
                        <p className="text-white text-lg font-semibold">Live Stream</p>
                        <p className="text-white/70 text-sm mt-2">
                          {selectedStream.title}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge variant="danger" className="flex items-center gap-1 animate-pulse">
                        <Radio className="h-3 w-3" />
                        LIVE
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMuted(!isMuted)}
                        className="bg-black/50 hover:bg-black/70 text-white"
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="bg-black/50 hover:bg-black/70 text-white"
                      >
                        {isFullscreen ? (
                          <Minimize className="h-5 w-5" />
                        ) : (
                          <Maximize className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                          {selectedStream.title}
                        </h2>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <RealTimeAvatar
                              userId={selectedStream.streamer.id}
                              src={selectedStream.streamer.avatar}
                              alt={selectedStream.streamer.name || "Streamer"}
                              size="sm"
                            />
                            <div>
                              <p className="font-semibold text-foreground text-sm">
                                {selectedStream.streamer.name || "Streamer"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(selectedStream.viewersCount)} viewers
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{selectedStream.category}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{selectedStream.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleLike}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        {formatNumber(selectedStream.likesCount)}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          if (!selectedStream || !session?.user?.id) return;
                          try {
                            // Emit gift event
                            const socket = getSocket();
                            if (socket) {
                              socket.emit("live_gift", {
                                streamId: selectedStream.id,
                                gift: {
                                  type: "heart",
                                  user: {
                                    id: session.user.id,
                                    name: session.user.name,
                                    avatar: session.user.image,
                                  },
                                },
                              });
                              toast.success("Gift sent! 🎁");
                            }
                          } catch (error) {
                            console.error("Error sending gift:", error);
                            toast.error("Failed to send gift");
                          }
                        }}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Send Gift
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Comments Sidebar */}
              <div className="lg:col-span-1">
                <Card variant="elevated" className="h-[calc(100vh-12rem)] flex flex-col">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-bold text-foreground">Live Chat</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(selectedStream.viewersCount)} viewers
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2">
                        <RealTimeAvatar
                          userId={comment.user.id}
                          src={comment.user.avatar}
                          alt={comment.user.name || "User"}
                          size="sm"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground text-sm">
                              {comment.user.name || "User"}
                            </span>
                            {comment.isGift && (
                              <Badge variant="primary" className="text-xs">
                                <Gift className="h-3 w-3 mr-1" />
                                Gift
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm">{comment.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleSendComment();
                          }
                        }}
                        className="flex-1 bg-secondary/50 border-input"
                      />
                      <Button
                        variant="primary"
                        size="icon"
                        onClick={handleSendComment}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Video className="h-8 w-8 text-destructive" />
                  Live Streaming
                </h1>
                <p className="text-muted-foreground">Watch and interact with live streams</p>
              </div>

              {/* Host Stream Section */}
              {session && (
                <ScrollReveal delay={0.1}>
                  <Card variant="elevated" className="mb-6">
                    <WebRTCLive isHost={true} streamId={session.user?.id} />
                  </Card>
                </ScrollReveal>
              )}

              {/* Live Streams Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveStreams.length === 0 ? (
                  !session && (
                    <Card variant="default" className="p-12 text-center col-span-full">
                      <Video className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                      <p className="text-muted-foreground">No live streams at the moment</p>
                    </Card>
                  )
                ) : (
                  liveStreams.map((stream, index) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card
                        variant="elevated"
                        hover
                        className="cursor-pointer overflow-hidden"
                        onClick={() => setSelectedStream(stream)}
                      >
                        <div className="relative aspect-video bg-gradient-to-r from-red-600 to-purple-600">
                          {stream.thumbnail ? (
                            <img
                              src={stream.thumbnail}
                              alt={stream.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Radio className="h-16 w-16 text-white animate-pulse" />
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <Badge variant="danger" className="flex items-center gap-1 animate-pulse">
                              <Radio className="h-3 w-3" />
                              LIVE
                            </Badge>
                          </div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center gap-2 text-white text-sm">
                              <Users className="h-4 w-4" />
                              <span>{formatNumber(stream.viewersCount)} watching</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <RealTimeAvatar
                              userId={stream.streamer.id}
                              src={stream.streamer.avatar}
                              alt={stream.streamer.name || "Streamer"}
                              size="sm"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-foreground text-sm line-clamp-1">
                                {stream.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {stream.streamer.name || "Streamer"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {formatNumber(stream.likesCount)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {stream.category}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

