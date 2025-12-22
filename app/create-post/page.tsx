"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Video,
  X,
  Send,
  ArrowLeft,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import getSocket from "@/lib/socket";

export default function CreatePostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  // Ensure socket connection
  useEffect(() => {
    const socket = getSocket();
    if (socket && session?.user?.id) {
      socket.emit("join", session.user.id);
      socket.on("connect", () => {
        socket.emit("join", session.user?.id || "");
      });
    }
  }, [session?.user?.id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;
    if (!files) return;

    // Limit to 4 images/videos
    if (images.length + files.length > 4) {
      toast.error("You can only upload up to 4 files");
      return;
    }

    Array.from(files).forEach((file) => {
      // Check file size (max 10MB for images, 50MB for videos)
      const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max ${file.type.startsWith("video/") ? "50MB" : "10MB"})`);
        return;
      }

      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (result) {
            setImages((prev) => [...prev, result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) {
      toast.error("Please add some content or upload media");
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          images,
          type: "regular",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create post");
      }

      const data = await response.json();

      // Emit socket event
      const socket = getSocket();
      if (socket && session.user?.id) {
        socket.emit("new_post", {
          postId: data.id,
          userId: session.user.id,
        });
      }

      toast.success("Post created successfully! 🎉");
      
      // Reset form
      setContent("");
      setTitle("");
      setImages([]);

      // Redirect to feed after a short delay
      setTimeout(() => {
        router.push("/feed");
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />

      {/* Main Content - Centered with sidebar spacing */}
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (document.referrer && document.referrer.includes(window.location.origin)) {
                  router.back();
                } else {
                  router.push("/feed");
                }
              }}
              className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <ImageIcon className="h-6 w-6 sm:h-7 sm:w-7 text-purple-400" />
              Upload Media
            </h1>
            <p className="text-sm sm:text-base text-gray-400">Share your photos and videos with the community</p>
          </div>

          <ScrollReveal delay={0.2}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="elevated" hover={false} className="mb-4 sm:mb-6 bg-gray-900/60 backdrop-blur-xl border-gray-800">
                <form onSubmit={handleSubmit}>
                  <div className="flex gap-3 sm:gap-4">
                    <RealTimeAvatar
                      userId={session.user?.id}
                      src={session.user?.image}
                      alt={session.user?.name || "User"}
                      size="md"
                      status="online"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Add a title (optional)"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <Textarea
                          placeholder="What's on your mind? Add a caption..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="min-h-[100px] sm:min-h-[120px] resize-none bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 text-sm sm:text-base focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      {/* Images/Video Preview */}
                      <AnimatePresence>
                        {images.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                          >
                            {images.map((img, index) => {
                              const isVideo = img.startsWith("data:video/");
                              return (
                                <motion.div
                                  key={index}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="relative group"
                                >
                                  {isVideo ? (
                                    <video
                                      src={img}
                                      className="w-full h-24 sm:h-32 object-cover rounded-lg"
                                      controls
                                    />
                                  ) : (
                                    <img
                                      src={img}
                                      alt={`Upload ${index + 1}`}
                                      className="w-full h-24 sm:h-32 object-cover rounded-lg"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                  >
                                    <X className="h-4 w-4 text-white" />
                                  </button>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Quick Actions - Only Photo and Video */}
                      <div className="pt-3 sm:pt-4 border-t border-gray-700/50">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                          {/* Action Buttons - Photo and Video Only */}
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Photo Button */}
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (fileInputRef.current) {
                                      fileInputRef.current.accept = "image/*";
                                      fileInputRef.current.click();
                                    }
                                  }}
                                  className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-blue-500/50 rounded-lg sm:rounded-xl transition-all group"
                                >
                                  <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 group-hover:text-blue-300" />
                                  <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">Photo</span>
                                </Button>
                              </motion.div>

                              {/* Video Button */}
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (fileInputRef.current) {
                                      fileInputRef.current.accept = "video/*";
                                      fileInputRef.current.click();
                                    }
                                  }}
                                  className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-red-500/50 rounded-lg sm:rounded-xl transition-all group"
                                >
                                  <Video className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 group-hover:text-red-300" />
                                  <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">Video</span>
                                </Button>
                              </motion.div>
                            </div>
                          </div>

                          {/* Post Button */}
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto"
                          >
                            <Button
                              type="submit"
                              variant="primary"
                              size="lg"
                              disabled={isPosting || (!content.trim() && images.length === 0)}
                              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isPosting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Posting...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Post
                                </>
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </Card>
            </motion.div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
