"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Video,
  Hash,
  X,
  Send,
  Smile,
  MapPin,
  BarChart3 as PollIcon,
  FileImage,
  Link as LinkIcon,
  FileText,
  Code,
  Film,
  Zap,
  ArrowLeft,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import getSocket from "@/lib/socket";

export default function CreatePostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postType, setPostType] = useState<"text" | "poll" | "story" | "reel">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hashtagInput, setHashtagInput] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState(7);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Limit to 4 images
    if (images.length + files.length > 4) {
      toast.error("You can only upload up to 4 images");
      return;
    }

    Array.from(files).forEach((file) => {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      if (hashtags.length >= 5) {
        toast.error("Max 5 hashtags allowed");
        return;
      }
      setHashtags((prev) => [...prev, tag]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && postType !== "poll") {
      toast.error("Please add some content to your post");
      return;
    }

    setIsPosting(true);
    try {
      if (postType === "poll") {
        const validOptions = pollOptions.filter(o => o.trim().length > 0);
        if (validOptions.length < 2) {
          toast.error("Please provide at least 2 poll options");
          setIsPosting(false);
          return;
        }
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          images,
          hashtags,
          postType: postType === "text" ? "regular" : postType,
          pollOptions: postType === "poll" ? pollOptions.filter(o => o.trim()) : undefined,
          pollDuration: postType === "poll" ? pollDuration : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create post");
      }

      toast.success("Post created successfully!");
      // Reset form
      setContent("");
      setTitle("");
      setImages([]);
      setHashtags([]);
      setPollOptions(["", ""]);

      router.push("/feed");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  const quickActions = [
    { icon: ImageIcon, label: "Photo", action: () => fileInputRef.current?.click() },
    { icon: Video, label: "Video", action: () => fileInputRef.current?.click() },
    { icon: PollIcon, label: "Poll", action: () => setPostType("poll") },
    { icon: Hash, label: "Hashtag", action: () => setHashtagInput("#") },
    { icon: MapPin, label: "Location", action: () => toast("Location feature coming soon") },
    { icon: Smile, label: "Emoji", action: () => toast("Emoji picker coming soon") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content - Centered with sidebar spacing */}
      <div className="pt-16 lg:pl-64">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Post</h1>
            <p className="text-muted-foreground">Share your thoughts with the community</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="elevated" className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="flex gap-4 mb-6">
                  <RealTimeAvatar
                    userId={session.user?.id}
                    src={session.user?.image}
                    alt={session.user?.name || "User"}
                    size="md"
                    status="online"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{session.user?.name || "User"}</p>
                    <p className="text-sm text-muted-foreground">What's on your mind?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Post Type Selector */}
                  <div className="flex gap-2 flex-wrap">
                    {(["text", "poll", "story", "reel"] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={postType === type ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setPostType(type)}
                        className="capitalize"
                      >
                        {type === "text" && <FileText className="h-4 w-4 mr-1" />}
                        {type === "poll" && <PollIcon className="h-4 w-4 mr-1" />}
                        {type === "story" && <Zap className="h-4 w-4 mr-1" />}
                        {type === "reel" && <Film className="h-4 w-4 mr-1" />}
                        {type}
                      </Button>
                    ))}
                  </div>

                  {/* Title Input */}
                  <div>
                    <Input
                      type="text"
                      placeholder="Add a title (optional)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-secondary/50 border-input"
                    />
                  </div>

                  {/* Content Textarea */}
                  <div>
                    <Textarea
                      placeholder="What's on your mind?"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[200px] resize-none bg-secondary/50 border-input"
                    />
                  </div>

                  {/* Poll Options */}
                  {postType === "poll" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">Poll Options</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addPollOption}
                          disabled={pollOptions.length >= 6}
                        >
                          + Add Option
                        </Button>
                      </div>
                      {pollOptions.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="text"
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...pollOptions];
                              newOptions[index] = e.target.value;
                              setPollOptions(newOptions);
                            }}
                            className="bg-secondary/50 border-input"
                          />
                          {pollOptions.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePollOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="mt-3">
                        <label className="text-xs text-muted-foreground mb-2 block">
                          Duration: {pollDuration} days
                        </label>
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

                  {/* Images Preview */}
                  <AnimatePresence>
                    {images.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 md:grid-cols-3 gap-3"
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
                              className="w-full h-32 object-cover rounded-lg"
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
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Hashtag Input */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add hashtag (e.g., #webdev)"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addHashtag();
                        }
                      }}
                      className="bg-secondary/50 border-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addHashtag}
                    >
                      Add
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-border">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={action.action}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <action.icon className="h-4 w-4 mr-1" />
                        {action.label}
                      </Button>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isPosting || (!content.trim() && images.length === 0 && postType !== "poll")}
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
        </div>
      </div>
    </div>
  );
}
