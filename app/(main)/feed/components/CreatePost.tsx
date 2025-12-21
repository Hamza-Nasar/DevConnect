"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Image as ImageIcon,
  Video,
  Hash,
  X,
  Send,
  Sparkles,
  Smile,
  MapPin,
  BarChart3 as PollIcon,
  FileImage,
  Link as LinkIcon,
  Calendar,
  Users,
  FileText,
  Code,
  Music,
  Film,
  Zap
} from "lucide-react";
import getSocket from "@/lib/socket";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { suggestHashtags } from "@/lib/ai/feedRanking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import EmojiPicker from "@/components/emoji/EmojiPicker";
import GifPicker from "@/components/gif/GifPicker";

export default function CreatePost() {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [postType, setPostType] = useState<"text" | "poll" | "story" | "reel">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [hashtagInput, setHashtagInput] = useState("");
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState(7);
  const [location, setLocation] = useState<string>("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState<any>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!session) return null;

  const handleContentChange = (value: string) => {
    setContent(value);
    if (value.length > 10) {
      const suggestions = suggestHashtags(value);
      setSuggestedHashtags(suggestions);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
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
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
      setHashtags((prev) => [...prev, hashtagInput.trim()]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions((prev) => [...prev, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Ensure socket connection and join user room on mount
  useEffect(() => {
    const socket = getSocket();
    if (socket && session?.user?.id) {
      // Join user room for real-time updates
      socket.emit("join", session.user.id);

      socket.on("connect", () => {
        socket.emit("join", session.user?.id || "");
      });
    }
  }, [session?.user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || isPosting) return;
    if (!content.trim() && images.length === 0 && postType !== "poll") {
      toast.error("Please add some content");
      return;
    }

    if (postType === "poll" && pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Please add at least 2 poll options");
      return;
    }

    setIsPosting(true);

    try {
      const postData: any = {
        content,
        title: title || undefined,
        images,
        hashtags,
        location: location || undefined,
        linkPreview: linkPreview || undefined,
        type: postType,
      };

      if (postType === "poll") {
        postData.pollOptions = pollOptions.filter(o => o.trim());
        postData.pollDuration = pollDuration;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (!res.ok) throw new Error("Failed to create post");

      const data = await res.json();

      // Server will handle socket emission, but we can also emit from client as backup
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
      setHashtags([]);
      setLocation("");
      setPollOptions(["", ""]);
      setPostType("text");
      setLinkUrl("");
      setLinkPreview(null);
      setShowLocationPicker(false);
      setShowEmojiPicker(false);
      setShowGifPicker(false);
      setShowLinkInput(false);
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // Quick actions are now handled inline in the UI

  return (
    <ScrollReveal delay={0.2}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card variant="elevated" hover={false} className="mb-4 sm:mb-6">
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
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="min-h-[100px] sm:min-h-[120px] resize-none bg-gray-800/50 border-gray-700 text-sm sm:text-base"
                  />
                </div>

                {/* Post Type Selector - Enhanced */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 sm:flex sm:flex-wrap sm:p-2 sm:bg-gray-800/20 sm:rounded-lg sm:rounded-xl sm:border sm:border-gray-700/30">
                  {(["text", "poll", "story", "reel"] as const).map((type) => (
                    <motion.div
                      key={type}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-shrink-0"
                    >
                      <Button
                        type="button"
                        variant={postType === type ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setPostType(type)}
                        className={`w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto transition-all group sm:flex-row sm:capitalize sm:text-xs sm:text-sm sm:px-2 sm:px-3 ${
                          postType === type
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 border border-purple-500/50 sm:border-0"
                            : "bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-purple-500/50"
                        } rounded-lg sm:rounded-xl`}
                      >
                        {type === "text" && <FileText className="h-4 w-4 sm:h-4 sm:w-4 text-purple-400 group-hover:text-purple-300 sm:mr-1.5" />}
                        {type === "poll" && <PollIcon className="h-4 w-4 sm:h-4 sm:w-4 text-purple-400 group-hover:text-purple-300 sm:mr-1.5" />}
                        {type === "story" && <Zap className="h-4 w-4 sm:h-4 sm:w-4 text-purple-400 group-hover:text-purple-300 sm:mr-1.5" />}
                        {type === "reel" && <Film className="h-4 w-4 sm:h-4 sm:w-4 text-purple-400 group-hover:text-purple-300 sm:mr-1.5" />}
                        <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white sm:text-white sm:group-hover:text-white">{type}</span>
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {/* Poll Options */}
                {postType === "poll" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2 p-3 sm:p-4 bg-gray-800/30 rounded-lg sm:rounded-xl border border-gray-700/50"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-300">Poll Options</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addPollOption}
                        disabled={pollOptions.length >= 6}
                        className="text-xs sm:text-sm w-full sm:w-auto"
                      >
                        + Add Option
                      </Button>
                    </div>
                    {pollOptions.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...pollOptions];
                            newOptions[index] = e.target.value;
                            setPollOptions(newOptions);
                          }}
                          className="flex-1 px-3 py-2 text-sm sm:text-base bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {pollOptions.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePollOption(index)}
                            className="h-9 w-9 sm:h-10 sm:w-10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="mt-2">
                      <label className="text-xs text-gray-400">Duration: {pollDuration} days</label>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={pollDuration}
                        onChange={(e) => setPollDuration(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Location Display */}
                {location && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-green-600/10 border border-green-500/30 rounded-lg"
                  >
                    <MapPin className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-300 flex-1">{location}</span>
                    <button
                      type="button"
                      onClick={() => setLocation("")}
                      className="ml-auto hover:text-red-400 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {/* Link Preview */}
                {linkPreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30"
                  >
                    {linkPreview.image && (
                      <img
                        src={linkPreview.image}
                        alt={linkPreview.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-1">{linkPreview.title}</h4>
                      {linkPreview.description && (
                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">{linkPreview.description}</p>
                      )}
                      <a
                        href={linkPreview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        {linkPreview.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkPreview(null);
                        setLinkUrl("");
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-600 rounded-full transition backdrop-blur-sm"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </motion.div>
                )}

                {/* Images Preview */}
                <AnimatePresence>
                  {images.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                    >
                      {images.map((img, index) => (
                        <motion.div
                          key={index}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="relative group"
                        >
                          <img
                            src={img}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 sm:h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4 text-destructive-foreground" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hashtags */}
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag) => (
                      <Badge key={tag} variant="primary" className="flex items-center gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Suggested Hashtags */}
                {suggestedHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-800/20 rounded-lg border border-gray-700/30">
                    <span className="text-xs text-gray-400 font-medium">Suggestions:</span>
                    {suggestedHashtags.slice(0, 5).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
                        onClick={() => {
                          if (!hashtags.includes(tag)) {
                            setHashtags((prev) => [...prev, tag]);
                          }
                        }}
                      >
                        + {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Hashtag Input - Enhanced */}
                {showHashtagInput && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-300">Add Hashtag</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="hashtag"
                        value={hashtagInput}
                        onChange={(e) => setHashtagInput(e.target.value.replace("#", ""))}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addHashtag();
                            setShowHashtagInput(false);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          addHashtag();
                          setShowHashtagInput(false);
                        }}
                        className="px-4"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowHashtagInput(false)}
                        className="hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Quick Actions - Enhanced Design */}
                <div className="pt-3 sm:pt-4 border-t border-gray-700/50">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                    {/* Action Buttons - Grouped by Category */}
                    <div className="flex-1 w-full sm:w-auto">
                      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-1.5 sm:gap-2">
                        {/* Media Actions */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-purple-500/50 rounded-lg sm:rounded-xl transition-all group"
                          >
                            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 group-hover:text-blue-300" />
                            <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">Photo</span>
                          </Button>
                        </motion.div>

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-red-500/50 rounded-lg sm:rounded-xl transition-all group"
                          >
                            <Video className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 group-hover:text-red-300" />
                            <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">Video</span>
                          </Button>
                        </motion.div>

                        {/* Content Actions */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPostType("poll")}
                            className={`w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto border rounded-lg sm:rounded-xl transition-all group ${postType === "poll"
                              ? "bg-purple-600/20 border-purple-500/50"
                              : "bg-gray-800/30 hover:bg-gray-800/60 border-gray-700/50 hover:border-purple-500/50"
                              }`}
                          >
                            <PollIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${postType === "poll" ? "text-purple-400" : "text-purple-400 group-hover:text-purple-300"}`} />
                            <span className={`text-[10px] sm:text-xs ${postType === "poll" ? "text-purple-300" : "text-gray-400 group-hover:text-white"}`}>Poll</span>
                          </Button>
                        </motion.div>

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHashtagInput(true)}
                            className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-blue-500/50 rounded-lg sm:rounded-xl transition-all group"
                          >
                            <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 group-hover:text-blue-300" />
                            <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">Tag</span>
                          </Button>
                        </motion.div>

                        {/* Location */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  async (position) => {
                                    try {
                                      // Use browser's reverse geocoding or simple location
                                      const lat = position.coords.latitude.toFixed(4);
                                      const lng = position.coords.longitude.toFixed(4);
                                      setLocation(`📍 ${lat}, ${lng}`);
                                      toast.success("Location added!");
                                    } catch (error) {
                                      setShowLocationPicker(true);
                                    }
                                  },
                                  () => {
                                    setShowLocationPicker(true);
                                  }
                                );
                              } else {
                                setShowLocationPicker(true);
                              }
                            }}
                            className={`w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto border rounded-lg sm:rounded-xl transition-all group ${location
                              ? "bg-green-600/20 border-green-500/50"
                              : "bg-gray-800/30 hover:bg-gray-800/60 border-gray-700/50 hover:border-green-500/50"
                              }`}
                          >
                            <MapPin className={`h-4 w-4 sm:h-5 sm:w-5 ${location ? "text-green-400" : "text-green-400 group-hover:text-green-300"}`} />
                            <span className={`text-[10px] sm:text-xs ${location ? "text-green-300" : "text-gray-400 group-hover:text-white"}`}>Location</span>
                          </Button>
                          {showLocationPicker && (
                            <div className="absolute bottom-full left-0 mb-2 w-64 sm:w-80 bg-gray-800 rounded-lg border border-gray-700 p-3 z-10">
                              <Input
                                type="text"
                                placeholder="Enter location..."
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    setShowLocationPicker(false);
                                  }
                                }}
                                className="mb-2 bg-gray-700/50 border-gray-600"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => setShowLocationPicker(false)}
                                  className="flex-1"
                                >
                                  Done
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setLocation("");
                                    setShowLocationPicker(false);
                                  }}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          )}
                        </motion.div>

                        {/* Emoji */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-yellow-500/50 rounded-lg sm:rounded-xl transition-all group"
                          >
                            <Smile className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 group-hover:text-yellow-300" />
                            <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">Emoji</span>
                          </Button>
                          <AnimatePresence>
                            {showEmojiPicker && (
                              <EmojiPicker
                                onSelect={(emoji) => {
                                  setContent((prev) => prev + emoji);
                                  setShowEmojiPicker(false);
                                }}
                                onClose={() => setShowEmojiPicker(false)}
                              />
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {/* GIF */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowGifPicker(!showGifPicker)}
                            className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-pink-500/50 rounded-lg sm:rounded-xl transition-all group"
                          >
                            <FileImage className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400 group-hover:text-pink-300" />
                            <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">GIF</span>
                          </Button>
                          {showGifPicker && (
                            <GifPicker
                              onSelect={(gifUrl) => {
                                setImages((prev) => [...prev, gifUrl]);
                                setShowGifPicker(false);
                              }}
                              onClose={() => setShowGifPicker(false)}
                            />
                          )}
                        </motion.div>

                        {/* Link */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowLinkInput(!showLinkInput)}
                            className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-cyan-500/50 rounded-lg sm:rounded-xl transition-all group"
                          >
                            <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 group-hover:text-cyan-300" />
                            <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-white">Link</span>
                          </Button>
                          {showLinkInput && (
                            <div className="absolute bottom-full left-0 mb-2 w-80 bg-gray-800 rounded-lg border border-gray-700 p-3 z-10">
                              <Input
                                type="url"
                                placeholder="Paste URL here..."
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyPress={async (e) => {
                                  if (e.key === "Enter" && linkUrl) {
                                    try {
                                      // Fetch link preview
                                      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(linkUrl)}`);
                                      if (response.ok) {
                                        const preview = await response.json();
                                        setLinkPreview(preview);
                                        setContent((prev) => prev + `\n${linkUrl}`);
                                      }
                                      setShowLinkInput(false);
                                    } catch (error) {
                                      toast.error("Failed to fetch link preview");
                                    }
                                  }
                                }}
                                className="mb-2 bg-gray-700/50 border-gray-600"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={async () => {
                                    if (linkUrl) {
                                      try {
                                        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(linkUrl)}`);
                                        if (response.ok) {
                                          const preview = await response.json();
                                          setLinkPreview(preview);
                                          setContent((prev) => prev + `\n${linkUrl}`);
                                        }
                                        setShowLinkInput(false);
                                      } catch (error) {
                                        toast.error("Failed to fetch link preview");
                                      }
                                    }
                                  }}
                                  className="flex-1"
                                >
                                  Add
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setLinkUrl("");
                                    setLinkPreview(null);
                                    setShowLinkInput(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
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
                        loading={isPosting}
                        disabled={isPosting || (!content.trim() && images.length === 0 && postType !== "poll")}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base"
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
  );
}
