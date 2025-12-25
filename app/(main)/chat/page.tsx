"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Send,
  Paperclip,
  Smile,
  Search,
  MoreVertical,
  Phone,
  Video,
  UserPlus,
  Image as ImageIcon,
  File,
  MessageCircle,
  Check,
  CheckCheck,
  Video as VideoIcon,
  FileText,
  ArrowLeft,
  Edit2,
  Reply,
  X,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/utils";
import getSocket from "@/lib/socket";
import { onlineStatusStore } from "@/lib/onlineStatusStore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import EmojiPicker from "emoji-picker-react";
import MessageItem from "./components/MessageItem";
import ThreadPanel from "./components/ThreadPanel";
import { Message, Chat } from "@/types/chat";
// @ts-ignore
import { useCall } from "@/components/providers/CallProvider";

// Types moved to @/types/chat

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const selectedChatRef = useRef<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when state changes
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingMessageId, setUploadingMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);

  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [socketId, setSocketId] = useState<string | null>(null);

  // Use global call context
  const { callUser: initiateGlobalCall } = useCall();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const hasJoinedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Initialize OnlineStatusStore
  useEffect(() => {
    onlineStatusStore.init();
  }, []);

  // Store current user ID in ref for message matching
  useEffect(() => {
    if (session?.user?.id) {
      currentUserIdRef.current = session.user.id;
    }
  }, [session?.user?.id]);

  // Handle mobile keyboard layout stability
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (!window.visualViewport) return;
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer && window.innerWidth < 1024) { // Only on mobile/tablet
        chatContainer.style.height = `${window.visualViewport.height}px`;
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize(); // Initial call

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = getSocket();
    if (!socket) return;

    // Named handlers for precise cleanup
    const onConnect = () => {
      console.log("🔌 [Socket] Connected:", socket.id);
      setSocketStatus('connected');
      setSocketId(socket.id || null);
      if (session.user?.id) {
        console.log("🔌 [Socket] Emitting join from onConnect for:", session.user.id);
        socket.emit("join", session.user.id);
        hasJoinedRef.current = true;
      }
    };

    const onDisconnect = (reason: string) => {
      console.log("🔌 [Socket] Disconnected:", reason);
      setSocketStatus('disconnected');
      setSocketId(null);
    };

    const onMediaUploadProgress = (data: { receiverId: string; progress: number; fileName: string }) => {
      if (selectedChatRef.current?.userId === data.receiverId) {
        setUploadProgress(data.progress);
      }
    };

    const onMediaUploadComplete = (data: { messageId: string; receiverId: string; type: string; fileName: string; success: boolean }) => {
      if (selectedChatRef.current?.userId === data.receiverId) {
        if (data.success) {
          setUploadProgress(100);
          setTimeout(() => {
            setUploadProgress(0);
            setUploadingMedia(false);
          }, 500);
        }
      }
    };

    const onNewMessage = (message: Message) => {
      console.log("📩 [Socket] New Message Received:", message);
      const currentSelected = selectedChatRef.current;
      const currentUserId = currentUserIdRef.current;

      if (!currentUserId) return;

      // Check if message is for current user (as receiver or sender)
      // const isForCurrentUser = ... (Strict check removed to trust server routing)

      console.log(`📩 [Socket] Processing message: ${message.id}`);

      // Check if message is for currently selected chat
      if (currentSelected) {
        const chatUserIds = [currentSelected.userId, ...(currentSelected.user?.alternativeIds || [])];
        const isSenderMatch = chatUserIds.includes(message.senderId);
        const isReceiverMatch = chatUserIds.includes(message.receiverId);

        const isForCurrentChat =
          (isSenderMatch) || // Simplified: if sender is the chat user, it's for this chat. receiver is obviously us (verified by server routing)
          (isReceiverMatch && message.senderId == currentUserId); // And if we sent it, it's for this chat too.

        console.log(`🔍 [Socket] Match result: ${isForCurrentChat ? "✅ YES" : "ℹ️ NO"}`);

        if (isForCurrentChat) {
          setMessages((prev) => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
          scrollToBottom();

          if (message.receiverId === currentUserId) {
            markAsRead(currentSelected.userId);
          }
        }
      }

      // Update chat list

      setChats((prev) => {
        const chatExists = prev.some(c => {
          const chatUserIds = [c.userId, ...(c.user?.alternativeIds || [])];
          return chatUserIds.includes(message.senderId) || chatUserIds.includes(message.receiverId);
        });
        if (chatExists) {
          return prev.map((chat) => {
            const chatUserIds = [chat.userId, ...(chat.user?.alternativeIds || [])];
            const isRelated = chatUserIds.includes(message.senderId) || chatUserIds.includes(message.receiverId);
            if (isRelated) {
              return {
                ...chat,
                lastMessage: {
                  content: message.content,
                  createdAt: message.createdAt,
                  read: message.read,
                },
                unreadCount: (message.senderId !== currentUserId && message.receiverId === currentUserId && chat.userId !== currentSelected?.userId)
                  ? chat.unreadCount + 1
                  : chat.unreadCount,
              };
            }
            return chat;
          }).sort((a, b) => {
            const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return dateB - dateA;
          });
        } else {
          fetchChats();
          return prev;
        }
      });
    };

    const onTyping = (data: { userId: string; isTyping: boolean; receiverId?: string }) => {
      console.log("⌨️ [Socket] Typing Event:", data);
      const currentUserId = session?.user?.id;

      // If it's ME typing on another tab
      if (data.userId === currentUserId) {
        if (data.receiverId === selectedChatRef.current?.userId) {
          // If I'm typing for the SAME receiver in another tab, maybe sync the input?
          // For now, just logging it.
          console.log("⌨️ [Socket] I am typing in another tab for this same chat.");
        }
        return;
      }

      const currentSelected = selectedChatRef.current;
      if (!currentSelected) return;

      const chatUserIds = [currentSelected.userId, ...(currentSelected.user?.alternativeIds || [])];
      const isMatch = chatUserIds.includes(data.userId);

      if (isMatch) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            if (prev.includes(data.userId)) return prev;
            return [...prev, data.userId];
          } else {
            return prev.filter((id) => id !== data.userId);
          }
        });
      }
    };

    const onMessageRead = (data: { messageId: string; userId: string }) => {
      console.log("👀 [Socket] Message ReadReceipt:", data);
      setMessages((prev) =>
        prev.map((m) =>
          (data.messageId === "all" || m.id === data.messageId) ? { ...m, read: true } : m
        )
      );
      setChats((prev) =>
        prev.map((chat) =>
          chat.userId === data.userId
            ? { ...chat, lastMessage: chat.lastMessage ? { ...chat.lastMessage, read: true } : undefined, unreadCount: data.messageId === "all" ? 0 : chat.unreadCount }
            : chat
        )
      );
    };

    const onMessageDelivered = (data: { messageId: string; userId: string; deliveredAt: Date }) => {
      console.log("\u2705 [Socket] Message Delivered Receipt:", data);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, delivered: true, deliveredAt: data.deliveredAt } : m
        )
      );
    };

    const onUserStatus = (data: { userId: string; status: any; lastSeen?: string }) => {
      console.log("👤 [Socket] User Status Change Received:", data);
      setChats((prev) => {
        return prev.map((chat) => {
          const chatUserIds = [chat.userId, ...(chat.user?.alternativeIds || [])];
          const isMatch = chatUserIds.includes(data.userId);
          if (isMatch) {
            console.log(`✅ [Socket] MATCH! Updating status for ${chat.user.name} to ${data.status}`);
            return { ...chat, user: { ...chat.user, status: data.status, lastSeen: data.lastSeen } };
          }
          return chat;
        });
      });

      const currentSelected = selectedChatRef.current;
      if (currentSelected) {
        const chatUserIds = [currentSelected.userId, ...(currentSelected.user?.alternativeIds || [])];
        const isSelectedMatch = chatUserIds.includes(data.userId);

        if (isSelectedMatch) {
          console.log(`✅ [Socket] Updating selected chat status to ${data.status}`);
          setSelectedChat((prev) =>
            prev ? { ...prev, user: { ...prev.user, status: data.status, lastSeen: data.lastSeen } } : null
          );
        }
      }
    };

    // Only emit join if already connected when effect runs
    if (socket.connected && !hasJoinedRef.current) {
      console.log("🔌 [Socket] Already connected, emitting join with userId:", session.user.id);
      socket.emit("join", session.user.id);
      hasJoinedRef.current = true;
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("message_read", onMessageRead);
    socket.on("message_delivered", onMessageDelivered);
    socket.on("user_status", onUserStatus);
    socket.on("media_upload_progress", onMediaUploadProgress);
    socket.on("media_uploaded", onMediaUploadComplete);

    const onMessageReaction = (data: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m
        )
      );
    };

    const onMessageEdited = (data: { messageId: string; content: string; edits: any[] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, content: data.content, edits: data.edits } : m
        )
      );
    };

    const onMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    socket.on("message_reaction", onMessageReaction);
    socket.on("message_edited", onMessageEdited);
    socket.on("message_deleted", onMessageDeleted);

    // Debug: Log ALL socket events to see what's being received
    const debugHandler = (eventName: string, ...args: any[]) => {
      console.log(`📡 [Socket] Event received: ${eventName}`, args);
      // Specifically log call_user events
      if (eventName === "call_user") {
        console.log("🔔 [Socket] CALL_USER EVENT RECEIVED!", args);
      }
    };
    socket.onAny(debugHandler);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("message_read", onMessageRead);
      socket.off("message_delivered", onMessageDelivered);
      socket.off("user_status", onUserStatus);
      socket.off("media_upload_progress", onMediaUploadProgress);
      socket.off("media_uploaded", onMediaUploadComplete);
      socket.offAny(debugHandler);

      // Cleanup typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [session?.user?.id]);

  // Presence Tracking (Active/Away)
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !session?.user?.id) return;

    const handlePresenceChange = (status: "online" | "away") => {
      socket.emit("update_presence", { status });
    };

    const onFocus = () => handlePresenceChange("online");
    const onBlur = () => handlePresenceChange("away");

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [session?.user?.id]);

  // Fetch chats only once on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchChats();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.userId);
      // Mark messages as read
      markAsRead(selectedChat.userId);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* Global Search State */
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle starting chat from URL
  useEffect(() => {
    const startChat = async () => {
      const params = new URLSearchParams(window.location.search);
      const userId = params.get("userId");

      if (!userId) return;

      const existingChat = chats.find(c => c.userId === userId);
      if (existingChat) {
        setSelectedChat(existingChat);
        return;
      }

      // Prevent fetch if we're already viewing this temp chat
      if (selectedChat?.userId === userId) return;

      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const user = await res.json();
          const newChat: any = {
            id: `temp-${userId}`,
            userId: userId,
            user: {
              id: userId,
              name: user.name,
              username: user.username,
              avatar: user.image || user.avatar,
              status: "offline",
              verified: user.verified
            },
            unreadCount: 0
          };
          setChats(prev => {
            if (prev.some(c => c.userId === userId)) return prev;
            return [newChat, ...prev];
          });
          setSelectedChat(newChat);
        }
      } catch (error) {
        console.error("Error starting new chat:", error);
      }
    };

    // Always check on mount/updates, logic handles idempotency
    startChat();
  }, [chats, selectedChat?.userId]); // Including selectedChat?.userId to satisfy dependencies

  // Global Search Effect
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const users = await res.json();
          setSearchResults(users.filter((u: any) => u.id !== session?.user?.id));
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, session?.user?.id]);


  const startNewChat = (user: any) => {
    // Check if chat exists
    const existingChat = chats.find(c => c.userId === user.id);
    if (existingChat) {
      setSelectedChat(existingChat);
      setSearchQuery(""); // Clear search to show chat list
    } else {
      const newChat: Chat = {
        id: `temp-${user.id}`,
        userId: user.id,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.image || user.avatar,
          status: "offline",
          verified: user.verified
        },
        unreadCount: 0
      };
      setChats(prev => [newChat, ...prev]);
      setSelectedChat(newChat);
      setSearchQuery("");
    }
  };


  const fetchChats = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const res = await fetch(`/api/messages/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const formatMessageContent = (content: string) => {
    if (!content) return "";

    // Regex to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline hover:text-blue-200 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const markAsRead = async (userId: string) => {
    try {
      const res = await fetch(`/api/messages/${userId}/read`, {
        method: "POST",
      });
      if (res.ok) {
        // Update local state
        setChats((prev) =>
          prev.map((chat) =>
            chat.userId === userId ? { ...chat, unreadCount: 0 } : chat
          )
        );

        // Emit socket event for each unread message
        const socket = getSocket();
        if (socket) {
          // This tells the SENDER that we read their messages
          socket.emit("message_read", {
            userId: session?.user?.id,
            senderId: userId,
            messageId: "all" // Or specific ID if available
          });
        }
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const callUser = async (userId: string, isVideo: boolean = true) => {
    if (!selectedChat) return;
    initiateGlobalCall(
      userId,
      selectedChat.user.name || "User",
      selectedChat.user.avatar || "",
      isVideo
    );
  };


  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedChat || isSending) return;

    console.log(`📤 [Client] Sending message to ${selectedChat.userId}...`);
    setIsSending(true);
    const socket = getSocket();
    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
      content: messageInput,
      senderId: session?.user?.id || "",
      receiverId: selectedChat.userId,
      createdAt: new Date().toISOString(),
      read: false,
      type: "text",
      sender: {
        id: session?.user?.id || "",
        name: session?.user?.name || undefined,
        avatar: session?.user?.image || undefined,
      },
    };

    // Optimistic update
    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      if (socket) {
        socket.emit("typing", {
          userId: selectedChat.userId,
          isTyping: false,
        });
      }
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    scrollToBottom();

    scrollToBottom();

    try {
      if (editingMessage) {
        const res = await fetch(`/api/messages/${editingMessage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: messageInput.trim() }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === editingMessage.id ? { ...m, content: data.content, edits: data.edits } : m))
          );

          if (socket) {
            socket.emit("message_edited", {
              messageId: editingMessage.id,
              userId: session?.user?.id,
              receiverId: selectedChat.userId,
              content: data.content,
              edits: data.edits,
            });
          }
          setEditingMessage(null);
          toast.success("Message updated");
        }
      } else {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: selectedChat.userId,
            content: messageInput.trim(),
            parentMessageId: replyingToMessage?.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Replace temp message with real one
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? data.message : m))
          );

          if (socket) {
            console.log("📤 [Client] Emitting send_message:", {
              messageId: data.message.id,
              senderId: data.message.senderId,
              receiverId: selectedChat.userId,
              socketConnected: socket.connected
            });
            socket.emit("send_message", {
              message: data.message,
              receiverId: selectedChat.userId,
            });
          }
          setReplyingToMessage(null);
        } else {
          // Remove failed message
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          toast.error("Failed to send message");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setMessageInput(value);
    const socket = getSocket();
    if (socket && selectedChat) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (value.length > 0) {
        // Start typing if not already typing
        if (!isTyping) {
          setIsTyping(true);
          socket.emit("typing", {
            userId: selectedChat.userId,
            isTyping: true,
          });
        }

        // Set timeout to stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          socket.emit("typing", {
            userId: selectedChat.userId,
            isTyping: false,
          });
          typingTimeoutRef.current = null;
        }, 3000);
      } else {
        // Stop typing immediately if input is empty
        if (isTyping) {
          setIsTyping(false);
          socket.emit("typing", {
            userId: selectedChat.userId,
            isTyping: false,
          });
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    }
  };

  const handleMessageReaction = async (messageId: string, emoji: string) => {
    if (!selectedChat) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (res.ok) {
        const { reactions } = await res.json();
        // Optimistic update
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );

        // Emit to socket
        const socket = getSocket();
        if (socket) {
          socket.emit("message_reaction", {
            messageId,
            userId: session?.user?.id,
            receiverId: selectedChat.userId,
            reactions,
          });
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleSendThreadMessage = async (content: string, parentMessageId: string) => {
    if (!selectedChat) return;

    try {
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedChat.userId,
          content,
          parentMessageId,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Notify socket
        const socket = getSocket();
        if (socket) {
          socket.emit("send_message", {
            message: data.message,
            receiverId: selectedChat.userId,
          });
        }
      }
    } catch (error) {
      console.error("Error sending thread message:", error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!selectedChat) return;
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        const socket = getSocket();
        if (socket) {
          socket.emit("message_deleted", {
            messageId,
            userId: session?.user?.id,
            receiverId: selectedChat.userId,
          });
        }
        toast.success("Message deleted");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    setUploadingMedia(true);
    setUploadProgress(0);
    const tempMessageId = Date.now().toString();
    setUploadingMessageId(tempMessageId);

    const socket = getSocket();

    try {
      // Emit upload start event for realtime notification
      if (socket) {
        socket.emit("media_upload_start", {
          receiverId: selectedChat.userId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
      }

      // Convert to base64 with progress tracking
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentLoaded = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentLoaded);

          // Emit progress update in realtime
          if (socket) {
            socket.emit("media_upload_progress", {
              receiverId: selectedChat.userId,
              progress: percentLoaded,
              fileName: file.name,
            });
          }
        }
      };

      reader.onload = async (e) => {
        setUploadProgress(100);
        const base64 = e.target?.result as string;
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        const message: Message = {
          id: tempMessageId,
          content: isImage ? "[Image]" : isVideo ? "[Video]" : `[File: ${file.name}]`,
          senderId: session?.user?.id || "",
          receiverId: selectedChat.userId,
          createdAt: new Date().toISOString(),
          read: false,
          type: isImage ? "image" : isVideo ? "video" : "file",
          imageUrl: isImage ? base64 : undefined,
          videoUrl: isVideo ? base64 : undefined,
          fileUrl: !isImage && !isVideo ? base64 : undefined,
          fileName: file.name,
          sender: {
            id: session?.user?.id || "",
            name: session?.user?.name || undefined,
            avatar: session?.user?.image || undefined,
          },
        };

        // Show optimistic message with upload indicator
        setMessages((prev) => [...prev, { ...message, content: `Uploading ${file.name}...` }]);
        scrollToBottom();

        // Emit upload processing event
        if (socket) {
          socket.emit("media_upload_processing", {
            receiverId: selectedChat.userId,
            fileName: file.name,
            type: message.type,
          });
        }

        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: selectedChat.userId,
            content: message.content,
            type: message.type,
            imageUrl: message.imageUrl,
            videoUrl: message.videoUrl,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === tempMessageId ? data.message : m))
          );

          if (socket) {
            // Emit message sent event
            socket.emit("send_message", {
              message: data.message,
              receiverId: selectedChat.userId,
            });

            // Emit media upload complete event for realtime updates
            socket.emit("media_uploaded", {
              messageId: data.message.id,
              receiverId: selectedChat.userId,
              type: message.type,
              fileName: file.name,
              success: true,
            });
          }

          toast.success(`${isImage ? "Image" : isVideo ? "Video" : "File"} uploaded successfully!`);
        } else {
          // Remove failed message
          setMessages((prev) => prev.filter((m) => m.id !== tempMessageId));
          if (socket) {
            socket.emit("media_upload_failed", {
              receiverId: selectedChat.userId,
              fileName: file.name,
              error: "Upload failed",
            });
          }
          toast.error("Failed to upload media");
        }
      };

      reader.onerror = () => {
        setUploadProgress(0);
        setUploadingMedia(false);
        setUploadingMessageId(null);
        if (socket) {
          socket.emit("media_upload_failed", {
            receiverId: selectedChat.userId,
            fileName: file.name,
            error: "File read error",
          });
        }
        toast.error("Failed to read file");
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading media:", error);
      setUploadProgress(0);
      if (socket) {
        socket.emit("media_upload_failed", {
          receiverId: selectedChat.userId,
          fileName: file.name,
          error: "Upload error",
        });
      }
      toast.error("Failed to upload media");
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      setUploadingMessageId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const filteredChats = chats.filter(
    (chat) =>
      chat.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayChats = searchQuery ? filteredChats : chats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-all duration-300">
      <div className={`${selectedChat ? "hidden lg:block" : "block transition-all duration-300"}`}>
        <Navbar />
      </div>
      <div className={`lg:pl-72 xl:pl-80 transition-all duration-300 ${selectedChat ? "pt-0 lg:pt-16" : "pt-16"}`}>
        <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-0 sm:py-4 lg:py-8 h-full">
          <div
            id="chat-container"
            className={`grid grid-cols-1 lg:grid-cols-3 gap-0 sm:gap-4 lg:gap-6 ${selectedChat ? "h-[100dvh] lg:h-[calc(100vh-12rem)]" : "h-[calc(100dvh-4rem)] sm:h-[calc(100vh-8rem)] lg:h-[calc(100vh-12rem)]"}`}
          >
            {/* Chat List - Enhanced Design */}
            <Card variant="elevated" className={`lg:col-span-1 p-0 overflow-hidden flex flex-col ${selectedChat ? "hidden lg:flex" : "flex"} bg-gray-900/60 backdrop-blur-xl border-gray-800`}>
              <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-purple-400" />
                      Messages
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${socketStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        {socketStatus === 'connected' ? `Live (${socketId?.slice(-4)})` : 'Realtime Offline'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Search people & conversations..."]') as HTMLInputElement;
                      if (input) input.focus();
                    }}
                    className="hover:bg-purple-500/20"
                  >
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search people & conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {searchQuery && searchResults.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">Global Search Results</p>
                    {searchResults.map(user => (
                      <motion.button
                        key={user.id}
                        onClick={() => startNewChat(user)}
                        whileHover={{ backgroundColor: "rgba(55, 65, 81, 0.3)" }}
                        className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                      >
                        <RealTimeAvatar
                          userId={user.id}
                          src={user.avatar}
                          alt={user.name || "User"}
                          size="md"
                          status="offline"
                          alternativeIds={user.alternativeIds}
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{user.name}</span>
                            {user.verified && <Badge variant="success" className="text-xs">✓</Badge>}
                          </div>
                          <p className="text-sm text-gray-400">@{user.username}</p>
                        </div>
                      </motion.button>
                    ))}
                    <div className="border-b border-gray-700/50 my-2"></div>
                  </div>
                )}

                {displayChats.length === 0 && !isSearching && !searchQuery ? (
                  <div className="text-center py-12 text-gray-400">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No conversations yet</p>
                    <p className="text-sm mt-2">Start a new conversation to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700/50">
                    {displayChats.map((chat) => (
                      <motion.button
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        whileHover={{ backgroundColor: "rgba(55, 65, 81, 0.3)" }}
                        className={`w-full p-4 transition-all ${selectedChat?.id === chat.id
                          ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-l-2 border-purple-500"
                          : ""
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <RealTimeAvatar
                              userId={chat.user.id}
                              src={chat.user.avatar}
                              alt={chat.user.name || "User"}
                              size="md"
                              status={chat.user.status || "offline"}
                              alternativeIds={chat.user.alternativeIds}
                            />
                            {chat.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-white">
                                  {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-white truncate">
                                  {chat.user.name || chat.user.username || "User"}
                                </span>
                                {chat.user.verified && (
                                  <Badge variant="success" className="text-xs flex-shrink-0">
                                    ✓
                                  </Badge>
                                )}
                              </div>
                              {chat.lastMessage && (
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                  {formatTimeAgo(chat.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-400 truncate">
                                {chat.lastMessage?.content || "No messages yet"}
                              </p>
                              {!chat.lastMessage?.read && chat.lastMessage && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Chat Window - Enhanced Design */}
            <Card
              variant="elevated"
              className={`lg:col-span-2 p-0 overflow-hidden flex flex-col ${!selectedChat ? "hidden lg:flex" : "flex"} bg-gray-900/60 backdrop-blur-xl border-gray-800`}
            >
              {selectedChat ? (
                <>
                  {/* Chat Header - Enhanced */}
                  <div className="p-3 sm:p-4 border-b border-gray-700/50 bg-gradient-to-r from-purple-600/10 to-blue-600/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto scrollbar-hide">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedChat(null)}
                        className="lg:hidden flex-shrink-0"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <Link
                        href={`/profile/${selectedChat.user.username || selectedChat.userId}`}
                        className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition min-w-0 flex-1"
                      >
                        <RealTimeAvatar
                          userId={selectedChat.user.id}
                          src={selectedChat.user.avatar}
                          alt={selectedChat.user.name || "User"}
                          size="md"
                          status={selectedChat.user.status || "offline"}
                          alternativeIds={selectedChat.user.alternativeIds}
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                              {selectedChat.user.name || "Unknown"}
                            </h3>
                            {selectedChat.user.verified && (
                              <Badge variant="success" className="text-xs flex-shrink-0">Verified</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedChat.user.status === "online"
                                ? "bg-green-500 animate-pulse"
                                : selectedChat.user.status === "away"
                                  ? "bg-yellow-500"
                                  : "bg-muted-foreground"
                                }`}
                            />
                            <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                              {selectedChat.user.status === "online"
                                ? "Online"
                                : selectedChat.user.status === "away"
                                  ? "Away"
                                  : selectedChat.user.lastSeen
                                    ? `Last seen ${formatTimeAgo(selectedChat.user.lastSeen)}`
                                    : "Offline"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => callUser(selectedChat.userId, false)}
                        className="hover:bg-green-500/10 h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center"
                        title="Voice Call"
                      >
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => callUser(selectedChat.userId, true)}
                        className="hover:bg-blue-500/10 h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center"
                        title="Video Call"
                      >
                        <Video className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex items-center justify-center">
                        <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages - Enhanced */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 bg-background/50 custom-scrollbar">
                    <AnimatePresence>
                      {messages.map((message, index) => {
                        const isOwn = message.senderId === session?.user?.id;
                        const showAvatar = !isOwn && (
                          index === 0 ||
                          messages[index - 1]?.senderId !== message.senderId
                        );

                        return (
                          <MessageItem
                            key={message.id}
                            message={message}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            onReaction={(emoji) => handleMessageReaction(message.id, emoji)}
                            onReply={() => setActiveThread(message)}
                            onEdit={(content) => {
                              setEditingMessage(message);
                              setMessageInput(content);
                            }}
                            onDelete={() => deleteMessage(message.id)}
                            formatContent={formatMessageContent}
                          />
                        );
                      })}
                    </AnimatePresence>

                    {/* Typing Indicator - Enhanced & Stylish */}
                    {typingUsers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-800 rounded-full px-2.5 py-1.5 shadow-md border border-gray-700/30 backdrop-blur-sm">
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              <motion.div
                                className="w-1 h-1 rounded-full bg-gradient-to-br from-purple-400 to-blue-400"
                                animate={{
                                  y: [0, -3, 0],
                                  scale: [1, 1.1, 1],
                                  opacity: [0.6, 1, 0.6],
                                }}
                                transition={{
                                  duration: 0.6,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                              <motion.div
                                className="w-1 h-1 rounded-full bg-gradient-to-br from-purple-400 to-blue-400"
                                animate={{
                                  y: [0, -3, 0],
                                  scale: [1, 1.1, 1],
                                  opacity: [0.6, 1, 0.6],
                                }}
                                transition={{
                                  duration: 0.6,
                                  repeat: Infinity,
                                  delay: 0.2,
                                  ease: "easeInOut",
                                }}
                              />
                              <motion.div
                                className="w-1 h-1 rounded-full bg-gradient-to-br from-purple-400 to-blue-400"
                                animate={{
                                  y: [0, -3, 0],
                                  scale: [1, 1.1, 1],
                                  opacity: [0.6, 1, 0.6],
                                }}
                                transition={{
                                  duration: 0.6,
                                  repeat: Infinity,
                                  delay: 0.4,
                                  ease: "easeInOut",
                                }}
                              />
                            </div>
                            <motion.span
                              className="text-[9px] text-gray-500 font-medium"
                              animate={{ opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              typing
                            </motion.span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Upload Progress Indicator - Realtime */}
                  {uploadingMedia && uploadProgress > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-2 bg-gradient-to-r from-gray-800/90 to-gray-800/70 border-t border-gray-700/50 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <motion.div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Paperclip className="h-4 w-4 text-white" />
                          </motion.div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-300 truncate">
                              {uploadingMessageId ? "Uploading media..." : "Processing..."}
                            </span>
                            <span className="text-xs text-gray-500 font-semibold flex-shrink-0 ml-2">
                              {uploadProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              style={{
                                backgroundSize: "200% 100%",
                                animation: "shimmer 2s infinite",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Message Input - Enhanced */}
                  <div className="p-2 sm:p-4 border-t border-gray-700/50 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowMediaMenu(!showMediaMenu)}
                          className="hover:bg-purple-500/20 h-10 w-10"
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        {showMediaMenu && (
                          <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-10 p-2">
                            <button
                              onClick={() => {
                                fileInputRef.current?.click();
                                setShowMediaMenu(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded text-gray-300 text-sm"
                            >
                              <ImageIcon className="h-4 w-4" />
                              Photo
                            </button>
                            <button
                              onClick={() => {
                                fileInputRef.current?.click();
                                setShowMediaMenu(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded text-gray-300 text-sm"
                            >
                              <VideoIcon className="h-4 w-4" />
                              Video
                            </button>
                            <button
                              onClick={() => {
                                fileInputRef.current?.click();
                                setShowMediaMenu(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded text-gray-300 text-sm"
                            >
                              <FileText className="h-4 w-4" />
                              File
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="flex-1 flex flex-col gap-1">
                        {(editingMessage || replyingToMessage) && (
                          <div className="flex items-center justify-between px-3 py-1 bg-gray-800 rounded-t-lg border-x border-t border-gray-700">
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-2">
                              {editingMessage ? (
                                <><Edit2 className="h-3 w-3" /> Editing message</>
                              ) : (
                                <><Reply className="h-3 w-3" /> Replying to {replyingToMessage?.sender?.name || "User"}</>
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => {
                                setEditingMessage(null);
                                setReplyingToMessage(null);
                                if (editingMessage) setMessageInput("");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <Input
                          type="text"
                          placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                          value={messageInput}
                          onChange={(e) => handleTyping(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          className={`flex-1 bg-gray-800/50 border-gray-700 focus:border-purple-500 min-h-[44px] ${(editingMessage || replyingToMessage) ? "rounded-t-none" : ""
                            }`}
                        />
                      </div>
                      <div className="relative">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="hover:bg-yellow-500/20"
                          >
                            <Smile className="h-5 w-5 text-yellow-400" />
                          </Button>
                          {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 z-50">
                              <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                  setMessageInput((prev) => prev + emojiData.emoji);
                                  setShowEmojiPicker(false);
                                }}
                                theme={"dark" as any}
                              />
                            </div>
                          )}
                        </div>
                        <Button
                          variant="primary"
                          size="icon"
                          onClick={sendMessage}
                          disabled={!messageInput.trim() || uploadingMedia}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                        >
                          {uploadingMedia ? (
                            <motion.div
                              className="relative"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            </motion.div>
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </Button>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900/50 to-gray-800/50">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center text-gray-400"
                  >
                    <MessageCircle className="h-20 w-20 mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-medium mb-2">Select a conversation</p>
                    <p className="text-sm">Choose a chat from the list to start messaging</p>
                  </motion.div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Thread Panel */}
      <AnimatePresence>
        {activeThread && (
          <ThreadPanel
            parentMessage={activeThread}
            onClose={() => setActiveThread(null)}
            onSendMessage={handleSendThreadMessage}
            formatContent={formatMessageContent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
