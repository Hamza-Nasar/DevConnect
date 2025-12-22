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
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [showCodeInput, setShowCodeInput] = useState(false);

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
          codeSnippet: (showCodeInput && code.trim()) ? { code, language } : undefined,
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

  const handleSuggestTags = async () => {
    if (!content.trim()) {
      toast.error("Please add some content first to suggest tags");
      return;
    }

    setIsSuggestingTags(true);
    try {
      const res = await fetch("/api/ai/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to suggest tags");

      const data = await res.json();
      if (data.tags && Array.isArray(data.tags)) {
        const newTags = data.tags.filter((tag: string) => !hashtags.includes(tag));
        if (newTags.length === 0) {
          toast.success("Current tags seem accurate! ✨");
        } else {
          setHashtags((prev) => [...prev, ...newTags].slice(0, 5));
          toast.success(`AI suggested ${newTags.length} new tags! ✨`);
        }
      }
    } catch (error) {
      console.error("Error suggesting tags:", error);
      toast.error("AI tagging failed. Please try again.");
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const quickActions = [
    { icon: ImageIcon, label: "Photo", action: () => fileInputRef.current?.click() },
    { icon: Video, label: "Video", action: () => fileInputRef.current?.click() },
    { icon: PollIcon, label: "Poll", action: () => setPostType("poll") },
    { icon: Hash, label: "Hashtag", action: () => setHashtagInput("#") },
    { icon: Code, label: "Code", action: () => setShowCodeInput(!showCodeInput) },
    { icon: MapPin, label: "Location", action: () => toast("Location feature coming soon") },
    { icon: Smile, label: "Emoji", action: () => toast("Emoji picker coming soon") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content - Centered with sidebar spacing */}
      <div className="pt-16 lg:pl-64">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-3 sm:mb-4 text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Create Post</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Share your thoughts with the community</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="elevated" className="p-4 sm:p-6">
              <form onSubmit={handleSubmit}>
                <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <RealTimeAvatar
                    userId={session.user?.id}
                    src={session.user?.image}
                    alt={session.user?.name || "User"}
                    size="md"
                    status="online"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm sm:text-base truncate">{session.user?.name || "User"}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">What's on your mind?</p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Post Type Selector */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 sm:flex sm:flex-wrap">
                    {(["text", "poll", "story", "reel"] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={postType === type ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setPostType(type)}
                        className="w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto transition-all group sm:flex-row sm:capitalize sm:text-xs sm:text-sm sm:px-2 sm:px-3 bg-secondary/30 hover:bg-secondary/60 border sm:border-0 rounded-lg"
                      >
                        {type === "text" && <FileText className="h-4 w-4 sm:h-4 sm:w-4 text-primary group-hover:text-primary sm:mr-1" />}
                        {type === "poll" && <PollIcon className="h-4 w-4 sm:h-4 sm:w-4 text-primary group-hover:text-primary sm:mr-1" />}
                        {type === "story" && <Zap className="h-4 w-4 sm:h-4 sm:w-4 text-primary group-hover:text-primary sm:mr-1" />}
                        {type === "reel" && <Film className="h-4 w-4 sm:h-4 sm:w-4 text-primary group-hover:text-primary sm:mr-1" />}
                        <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground sm:text-foreground">{type}</span>
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
                      className="min-h-[150px] sm:min-h-[200px] resize-none bg-secondary/50 border-input text-sm sm:text-base"
                    />
                  </div>

                  {/* Code Input */}
                  {showCodeInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 p-3 sm:p-4 bg-gray-900 rounded-lg sm:rounded-xl border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-primary" />
                          <span className="text-xs sm:text-sm font-medium text-gray-300">Code Snippet</span>
                        </div>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="bg-gray-800 text-gray-300 text-xs rounded border border-gray-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="python">Python</option>
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="rust">Rust</option>
                          <option value="go">Go</option>
                          <option value="java">Java</option>
                        </select>
                      </div>
                      <Textarea
                        placeholder="Paste your code here..."
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="min-h-[150px] font-mono text-xs sm:text-sm bg-gray-950 border-gray-800 text-gray-300 focus:ring-primary"
                      />
                    </motion.div>
                  )}

                  {/* Poll Options */}
                  {postType === "poll" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 p-3 sm:p-4 bg-muted/30 rounded-lg sm:rounded-xl border border-border"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">Poll Options</span>
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
                          <Input
                            type="text"
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...pollOptions];
                              newOptions[index] = e.target.value;
                              setPollOptions(newOptions);
                            }}
                            className="bg-secondary/50 border-input text-sm sm:text-base"
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
                        className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3"
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
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Hashtag Input */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted-foreground">Hashtags</label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSuggestTags}
                        disabled={isSuggestingTags || !content.trim() || hashtags.length >= 5}
                        className="h-7 text-[10px] sm:text-xs text-primary hover:text-primary/80 hover:bg-primary/10 gap-1"
                      >
                        {isSuggestingTags ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                        ) : (
                          <Zap className="h-3 w-3" />
                        )}
                        Suggest AI Tags
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
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
                        className="bg-secondary/50 border-input text-sm sm:text-base flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addHashtag}
                        className="w-full sm:w-auto text-sm sm:text-base"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-3 sm:pt-4 border-t border-border">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={action.action}
                        className="text-muted-foreground hover:text-foreground text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <action.icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {action.label}
                      </Button>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="w-full sm:w-auto text-sm sm:text-base"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isPosting || (!content.trim() && images.length === 0 && postType !== "poll")}
                      className="w-full sm:w-auto text-sm sm:text-base"
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
