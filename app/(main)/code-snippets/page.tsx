"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Code,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Star,
  Heart,
  MessageCircle,
  Share2,
  FileCode,
  Terminal,
  Zap,
  Globe,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { Modal } from "@/components/ui/modal";
import { formatTimeAgo, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  user: {
    id: string;
    name?: string;
    avatar?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  forksCount: number;
  createdAt: string;
}

export default function CodeSnippetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newSnippet, setNewSnippet] = useState({
    title: "",
    description: "",
    code: "",
    language: "javascript",
    tags: [] as string[],
  });

  const languages = [
    "javascript",
    "typescript",
    "python",
    "java",
    "cpp",
    "csharp",
    "go",
    "rust",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "html",
    "css",
    "sql",
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchSnippets();
  }, [selectedLanguage]);

  const fetchSnippets = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLanguage !== "all") params.append("language", selectedLanguage);
      if (searchQuery) params.append("q", searchQuery);

      const res = await fetch(`/api/code-snippets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSnippets(data.snippets || []);
      }
    } catch (error) {
      console.error("Error fetching snippets:", error);
    }
  };

  const handleCreateSnippet = async () => {
    if (!newSnippet.title || !newSnippet.code) {
      toast.error("Title and code are required");
      return;
    }

    try {
      const res = await fetch("/api/code-snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSnippet),
      });

      if (res.ok) {
        toast.success("Code snippet created!");
        setShowCreateModal(false);
        setNewSnippet({ title: "", description: "", code: "", language: "javascript", tags: [] });
        fetchSnippets();
      }
    } catch (error) {
      console.error("Error creating snippet:", error);
      toast.error("Failed to create snippet");
    }
  };

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/api/code-snippets/${id}/like`, {
        method: "POST",
      });
      if (res.ok) {
        fetchSnippets();
      }
    } catch (error) {
      console.error("Error liking snippet:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const filteredSnippets = snippets.filter(
    (snippet) =>
      snippet.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
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
                  <Code className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                  Code Snippets
                </h1>
                <p className="text-sm sm:text-base text-gray-400">Share and discover code snippets</p>
              </div>
              <Button variant="primary" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Snippet
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search snippets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700"
                />
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white w-full sm:w-auto"
              >
                <option value="all">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Snippets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredSnippets.length === 0 ? (
              <Card variant="default" className="p-12 text-center col-span-full">
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                <p className="text-gray-400">No code snippets found</p>
              </Card>
            ) : (
              filteredSnippets.map((snippet, index) => (
                <motion.div
                  key={snippet.id || `snippet-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card variant="elevated" className="overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-700/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <RealTimeAvatar
                              userId={snippet.user.id}
                              src={snippet.user.avatar}
                              alt={snippet.user.name || "User"}
                              size="sm"
                            />
                            <span className="font-semibold text-white">
                              {snippet.user.name || snippet.user.id || "User"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {snippet.language}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-1">{snippet.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {snippet.description}
                          </p>
                        </div>
                      </div>

                      {/* Tags */}
                      {snippet.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {snippet.tags.map((tag, idx) => (
                            <Badge key={`${snippet.id}-tag-${idx}-${tag}`} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Code Block */}
                    <div className="relative bg-gray-900 p-4">
                      <div className="absolute top-2 right-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(snippet.code, snippet.id)}
                          className="h-8 w-8"
                        >
                          {copiedId === snippet.id ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-sm text-gray-300 overflow-x-auto">
                        <code>{snippet.code}</code>
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center flex-wrap gap-3 sm:gap-4 text-sm text-gray-400">
                        <button
                          onClick={() => handleLike(snippet.id)}
                          className="flex items-center gap-1 hover:text-red-400 transition"
                        >
                          <Heart className="h-4 w-4" />
                          {formatNumber(snippet.likesCount)}
                        </button>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {formatNumber(snippet.commentsCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="h-4 w-4" />
                          {formatNumber(snippet.sharesCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCode className="h-4 w-4" />
                          {formatNumber(snippet.forksCount)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(snippet.createdAt)}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Snippet Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Code Snippet"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <Input
              value={newSnippet.title}
              onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
              className="bg-gray-800/50 border-gray-700"
              placeholder="Snippet title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <Textarea
              value={newSnippet.description}
              onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
              className="bg-gray-800/50 border-gray-700 min-h-[80px]"
              placeholder="What does this code do?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
            <select
              value={newSnippet.language}
              onChange={(e) => setNewSnippet({ ...newSnippet, language: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Code</label>
            <Textarea
              value={newSnippet.code}
              onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
              className="bg-gray-900 border-gray-700 font-mono text-sm min-h-[200px]"
              placeholder="Paste your code here..."
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleCreateSnippet} className="flex-1">
              Create Snippet
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


