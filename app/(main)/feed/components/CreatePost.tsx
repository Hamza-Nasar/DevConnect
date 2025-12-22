"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  X,
  Send,
} from "lucide-react";
import getSocket from "@/lib/socket";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { suggestHashtags } from "@/lib/ai/feedRanking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

// Subcomponents
import PostTypeSelector from "./subcomponents/PostTypeSelector";
import PollEditor from "./subcomponents/PollEditor";
import QuickActions from "./subcomponents/QuickActions";

export default function CreatePost() {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
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

  useEffect(() => {
    const socket = getSocket();
    if (socket && session?.user?.id) {
      socket.emit("join", session.user.id);
      socket.on("connect", () => {
        socket.emit("join", session.user?.id || "");
      });
    }
  }, [session?.user?.id]);

  if (!session) return null;

  const handleContentChange = (value: string) => {
    setContent(value);
    if (value.length > 10) {
      setSuggestedHashtags(suggestHashtags(value));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => setImages((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleLinkSubmit = async (url: string) => {
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const preview = await response.json();
        setLinkPreview(preview);
        setContent((prev) => prev + `\n${url}`);
        setShowLinkInput(false);
      }
    } catch (error) {
      toast.error("Failed to fetch link preview");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || isPosting) return;
    if (!content.trim() && images.length === 0 && postType !== "poll") {
      toast.error("Please add some content");
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

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      getSocket()?.emit("new_post", { postId: data.id, userId: session.user.id });

      toast.success("Post created successfully! 🎉");
      resetForm();
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const resetForm = () => {
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
  };

  return (
    <ScrollReveal delay={0.2}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="elevated" hover={false} className="mb-4 sm:mb-6">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-3 sm:gap-4">
              <RealTimeAvatar
                userId={session.user?.id}
                src={session.user?.image}
                alt={session.user?.name || "User"}
                size="md"
                status="online"
              />
              <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Add a title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 text-sm sm:text-base bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <Textarea
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="min-h-[100px] sm:min-h-[120px] resize-none bg-gray-800/50 border-gray-700"
                  />
                </div>

                <PostTypeSelector postType={postType} setPostType={setPostType} />

                {postType === "poll" && (
                  <PollEditor
                    pollOptions={pollOptions}
                    setPollOptions={setPollOptions}
                    pollDuration={pollDuration}
                    setPollDuration={setPollDuration}
                  />
                )}

                {location && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-green-600/10 border border-green-500/30 rounded-lg">
                    <span className="text-sm text-green-300 flex-1">{location}</span>
                    <button type="button" onClick={() => setLocation("")} className="hover:text-red-400"><X className="h-4 w-4" /></button>
                  </motion.div>
                )}

                {linkPreview && (
                  <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30">
                    {linkPreview.image && <img src={linkPreview.image} alt={linkPreview.title} className="w-full h-48 object-cover" />}
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-1">{linkPreview.title}</h4>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{linkPreview.description}</p>
                      <a href={linkPreview.url} target="_blank" rel="noopener" className="text-xs text-purple-400">{linkPreview.url}</a>
                    </div>
                    <button type="button" onClick={() => { setLinkPreview(null); setLinkUrl(""); }} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full"><X className="h-3 w-3 text-white" /></button>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt="" className="w-full h-24 sm:h-32 object-cover rounded-lg" />
                        <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100"><X className="h-4 w-4 text-white" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag) => (
                    <Badge key={tag} variant="primary" className="flex items-center gap-1">#{tag}<button type="button" onClick={() => setHashtags(prev => prev.filter(t => t !== tag))} className="ml-1"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>

                {suggestedHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-800/20 rounded-lg border border-gray-700/30">
                    <span className="text-xs text-gray-400 font-medium">Suggestions:</span>
                    {suggestedHashtags.slice(0, 5).map((tag) => (
                      <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-purple-500/20" onClick={() => !hashtags.includes(tag) && setHashtags(prev => [...prev, tag])}>+ {tag}</Badge>
                    ))}
                  </div>
                )}

                {showHashtagInput && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="hashtag"
                        value={hashtagInput}
                        onChange={(e) => setHashtagInput(e.target.value.replace("#", ""))}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), hashtagInput.trim() && !hashtags.includes(hashtagInput.trim()) && setHashtags([...hashtags, hashtagInput.trim()]), setHashtagInput(""), setShowHashtagInput(false))}
                        className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                        autoFocus
                      />
                      <Button type="button" variant="primary" size="sm" onClick={() => { hashtagInput.trim() && !hashtags.includes(hashtagInput.trim()) && setHashtags([...hashtags, hashtagInput.trim()]); setHashtagInput(""); setShowHashtagInput(false); }}>Add</Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setShowHashtagInput(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </motion.div>
                )}

                <div className="pt-3 sm:pt-4 border-t border-gray-700/50">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                    <QuickActions
                      onMediaClick={() => fileInputRef.current?.click()}
                      onPollClick={() => setPostType("poll")}
                      onTagClick={() => setShowHashtagInput(true)}
                      location={location}
                      setLocation={setLocation}
                      showLocationPicker={showLocationPicker}
                      setShowLocationPicker={setShowLocationPicker}
                      showEmojiPicker={showEmojiPicker}
                      setShowEmojiPicker={setShowEmojiPicker}
                      onEmojiSelect={(emoji) => setContent(prev => prev + emoji)}
                      showGifPicker={showGifPicker}
                      setShowGifPicker={setShowGifPicker}
                      onGifSelect={(url) => setImages(prev => [...prev, url])}
                      showLinkInput={showLinkInput}
                      setShowLinkInput={setShowLinkInput}
                      linkUrl={linkUrl}
                      setLinkUrl={setLinkUrl}
                      onLinkSubmit={handleLinkSubmit}
                      postType={postType}
                    />

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={isPosting}
                        disabled={isPosting || (!content.trim() && images.length === 0 && postType !== "poll")}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                      >
                        {isPosting ? "Posting..." : <><Send className="h-4 w-4 mr-2" />Post</>}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </form>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleImageUpload} className="hidden" />
        </Card>
      </motion.div>
    </ScrollReveal>
  );
}
