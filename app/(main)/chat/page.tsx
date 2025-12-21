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
  Settings,
  X,
  Image as ImageIcon,
  File,
  Mic,
  MessageCircle,
  Check,
  CheckCheck,
  Clock,
  ImagePlus,
  Video as VideoIcon,
  FileText,
  Music,
  MapPin,
  Gift,
  ArrowLeft,
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
// @ts-ignore
import SimplePeer from "simple-peer";

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
  type?: "text" | "image" | "file" | "video";
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  sender?: {
    id: string;
    name?: string;
    avatar?: string;
  };
}

interface Chat {
  id: string;
  userId: string;
  user: {
    id: string;
    name?: string;
    username?: string;
    avatar?: string;
    status?: "online" | "offline" | "away";
    lastSeen?: string;
    verified?: boolean;
    alternativeIds?: string[];
  };
  lastMessage?: {
    content: string;
    createdAt: string;
    read: boolean;
  };
  unreadCount: number;
}

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Call States
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [outgoingCall, setOutgoingCall] = useState<{ userId: string; isVideo: boolean; userName?: string; userAvatar?: string } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [activeCallIsVideo, setActiveCallIsVideo] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [otherUserStream, setOtherUserStream] = useState<MediaStream | null>(null);
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null); // Ringtone Ref
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [socketId, setSocketId] = useState<string | null>(null);

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

  // Handle media stream attachment to video elements
  useEffect(() => {
    if (stream && myVideo.current) {
      myVideo.current.srcObject = stream;
    }
  }, [stream, callActive, callAccepted]);

  useEffect(() => {
    if (otherUserStream && userVideo.current) {
      userVideo.current.srcObject = otherUserStream;
    }
  }, [otherUserStream, callActive, callAccepted]);

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
        socket.emit("join", session.user.id);
      }
    };

    const onDisconnect = (reason: string) => {
      console.log("🔌 [Socket] Disconnected:", reason);
      setSocketStatus('disconnected');
      setSocketId(null);
    };

    const onNewMessage = (message: Message) => {
      console.log("📩 [Socket] New Message Received:", message);
      const currentSelected = selectedChatRef.current;
      const currentUserId = currentUserIdRef.current;

      if (!currentUserId) return;

      // Check if message is for current user (as receiver or sender)
      const isForCurrentUser =
        message.receiverId === currentUserId ||
        message.senderId === currentUserId;

      if (!isForCurrentUser) {
        console.log(`🔍 [Socket] Message not for current user`);
        // Still update chat list
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
        return;
      }

      // Check if message is for currently selected chat
      if (currentSelected) {
        const chatUserIds = [currentSelected.userId, ...(currentSelected.user?.alternativeIds || [])];
        const isSenderMatch = chatUserIds.includes(message.senderId);
        const isReceiverMatch = chatUserIds.includes(message.receiverId);

        const isForCurrentChat =
          (isSenderMatch && message.receiverId === currentUserId) ||
          (isReceiverMatch && message.senderId === currentUserId);

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

    const onTyping = (data: { userId: string; isTyping: boolean }) => {
      console.log("⌨️ [Socket] Typing Event:", data);
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

    const onCallUser = (data: any) => {
      console.log("📞 [Socket] Incoming Call Event:", data);
      const currentUserId = currentUserIdRef.current;
      console.log("📞 [Socket] Current User ID:", currentUserId, "Call From:", data.from);

      // Check if call is for current user (not from self)
      if (!currentUserId) {
        console.warn("⚠️ [Socket] No current user ID available");
        return;
      }

      if (data.from === currentUserId) {
        console.log("⚠️ [Socket] Call from self, ignoring");
        return;
      }

      // This is an incoming call for current user
      console.log("✅ [Socket] Incoming call received for current user");
      setIncomingCall({
        isReceivingCall: true,
        from: data.from,
        name: data.name || "Unknown",
        avatar: data.avatar,
        signal: data.signal,
        isVideo: data.isVideo ?? true
      });
      setOutgoingCall(null); // Clear any outgoing call
      setCallActive(true);
      setCallAccepted(false);
      setCallEnded(false);
    };

    const onCallEnded = () => {
      console.log("📴 [Socket] Call Ended");
      setCallEnded(true);

      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (otherUserStream) {
        otherUserStream.getTracks().forEach(track => track.stop());
        setOtherUserStream(null);
      }

      // Clean up peer connection
      if (connectionRef.current) {
        connectionRef.current.destroy();
        connectionRef.current = null;
      }

      // Clear video elements
      if (myVideo.current) {
        myVideo.current.srcObject = null;
      }
      if (userVideo.current) {
        userVideo.current.srcObject = null;
      }

      setCallActive(false);
      setCallAccepted(false);
      setIncomingCall(null);
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
    socket.on("user_status", onUserStatus);
    socket.on("call_user", onCallUser);
    socket.on("call_ended", onCallEnded);

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
      socket.off("user_status", onUserStatus);
      socket.off("call_user", onCallUser);
      socket.off("call_ended", onCallEnded);
      socket.offAny(debugHandler);

      // Cleanup typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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

  // Ringtone Logic - Initialize audio element once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!ringtoneRef.current) {
      try {
        ringtoneRef.current = new Audio("/sounds/ringtone.mp3");
        ringtoneRef.current.loop = true;
        ringtoneRef.current.volume = 0.7;
        ringtoneRef.current.preload = "auto";

        // Handle audio load errors
        ringtoneRef.current.addEventListener("error", (e) => {
          const error = ringtoneRef.current?.error;
          if (error) {
            let errorMsg = "Unknown error";
            switch (error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMsg = "Audio loading aborted";
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMsg = "Network error loading audio";
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMsg = "Audio decode error";
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMsg = "Audio format not supported or file not found";
                break;
            }
            console.warn("⚠️ [Ringtone] Audio load error:", errorMsg, "Code:", error.code);
          } else {
            console.warn("⚠️ [Ringtone] Audio load error (no error details)");
          }
        });

        // Handle audio can play
        ringtoneRef.current.addEventListener("canplaythrough", () => {
          console.log("✅ [Ringtone] Audio ready to play");
        });

        // Handle audio loaded
        ringtoneRef.current.addEventListener("loadeddata", () => {
          console.log("✅ [Ringtone] Audio data loaded");
        });

        // Load the audio (but don't fail if it doesn't load)
        try {
          ringtoneRef.current.load();
        } catch (err: any) {
          console.warn("⚠️ [Ringtone] Audio load() failed (non-critical):", err.message);
        }
      } catch (error: any) {
        console.warn("⚠️ [Ringtone] Failed to create audio element (non-critical):", error.message);
        // Don't create audio element if it fails - app will continue without ringtone
      }
    }
  }, []);

  // Sync video elements with streams
  useEffect(() => {
    if (stream && myVideo.current && myVideo.current.srcObject !== stream) {
      console.log("🔄 [Call] Syncing local stream to video element");
      myVideo.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (otherUserStream && userVideo.current && userVideo.current.srcObject !== otherUserStream) {
      console.log("🔄 [Call] Syncing remote stream to video element");
      userVideo.current.srcObject = otherUserStream;
    }
  }, [otherUserStream]);

  // Ringtone Play/Pause Logic
  useEffect(() => {
    if (!ringtoneRef.current) return;

    if (incomingCall && !callAccepted && !callEnded) {
      console.log("🔔 [Ringtone] Starting ringtone");

      // Check if audio is ready
      if (ringtoneRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        const playPromise = ringtoneRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("✅ [Ringtone] Playing");
            })
            .catch((e) => {
              console.error("❌ [Ringtone] Play failed:", e);
              // Try to play after user interaction
              const handleUserInteraction = () => {
                if (ringtoneRef.current && incomingCall && !callAccepted) {
                  ringtoneRef.current.play().catch(err =>
                    console.log("Audio play failed after interaction", err)
                  );
                }
                document.removeEventListener('click', handleUserInteraction);
                document.removeEventListener('touchstart', handleUserInteraction);
              };
              document.addEventListener('click', handleUserInteraction, { once: true });
              document.addEventListener('touchstart', handleUserInteraction, { once: true });
            });
        }
      } else {
        // Wait for audio to load
        const handleCanPlay = () => {
          if (ringtoneRef.current && incomingCall && !callAccepted) {
            ringtoneRef.current.play().catch(e =>
              console.error("Play failed after load", e)
            );
          }
          ringtoneRef.current?.removeEventListener("canplaythrough", handleCanPlay);
        };
        ringtoneRef.current.addEventListener("canplaythrough", handleCanPlay);
      }
    } else {
      if (ringtoneRef.current && !ringtoneRef.current.paused) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        console.log("🔕 [Ringtone] Stopped");
      }
    }

    return () => {
      if (ringtoneRef.current && !ringtoneRef.current.paused) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };
  }, [incomingCall, callAccepted, callEnded]);

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
          const newChat: Chat = {
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
  }, [chats]); // Keeping chats dep to ensure we find existing ones if they load late

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
    setCallActive(true);
    setCallEnded(false);
    setCallAccepted(false);
    setIncomingCall(null); // Clear any incoming call
    setOutgoingCall({
      userId,
      isVideo,
      userName: selectedChat?.user.name,
      userAvatar: selectedChat?.user.avatar
    }); // Track outgoing call
    setActiveCallIsVideo(isVideo);
    const constraints = { video: isVideo, audio: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(stream);

      // Set stream to video element immediately
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }

      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      });

      peer.on("signal", (data: any) => {
        const socket = getSocket();
        socket?.emit("call_user", {
          userToCall: userId,
          signalData: data,
          from: session?.user?.id,
          name: session?.user?.name,
          avatar: session?.user?.image,
          isVideo
        });
      });

      peer.on("stream", (currentStream: MediaStream) => {
        console.log("📹 [Call] Received remote stream");
        setOtherUserStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      });

      peer.on("error", (err: any) => {
        console.error("❌ [Call] Peer error:", err);
        toast.error("Call connection error");
      });

      const socket = getSocket();
      const handleCallAccepted = (signal: any) => {
        console.log("✅ [Call] Call accepted, signaling peer");
        setCallAccepted(true);
        peer.signal(signal);
        socket?.off("call_accepted", handleCallAccepted);
      };

      socket?.on("call_accepted", handleCallAccepted);

      connectionRef.current = peer;
    } catch (err) {
      console.error("Failed to get media", err);
      setCallActive(false);
      toast.error("Could not access camera/microphone");
    }
  };

  const answerCall = async () => {
    const isVideo = incomingCall?.isVideo ?? true;
    setActiveCallIsVideo(isVideo);

    try {
      console.log("📞 [Call] Answering call, getting user media...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      setStream(stream);

      // Set stream to video element immediately
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
        console.log("✅ [Call] Local stream set to video element");
      }

      console.log("📞 [Call] Creating peer connection...");
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      });

      peer.on("signal", (data: any) => {
        console.log("📞 [Call] Peer signal generated, sending answer...");
        const socket = getSocket();
        socket?.emit("answer_call", { signal: data, to: incomingCall.from });
      });

      peer.on("stream", (currentStream: MediaStream) => {
        console.log("📹 [Call] Received remote stream!", currentStream);
        setOtherUserStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
          console.log("✅ [Call] Remote stream set to video element");
        } else {
          console.warn("⚠️ [Call] userVideo ref is null!");
        }
      });

      peer.on("connect", () => {
        console.log("✅ [Call] Peer connection established!");
        setCallAccepted(true);
        setIncomingCall(null); // Clear incoming call state when connected
        setOutgoingCall(null); // Clear outgoing call state when connected
      });

      peer.on("error", (err: any) => {
        console.error("❌ [Call] Peer error:", err);
        toast.error("Call connection error: " + err.message);
      });

      console.log("📞 [Call] Signaling peer with incoming call signal...");
      peer.signal(incomingCall.signal);
      connectionRef.current = peer;
    } catch (err: any) {
      console.error("❌ [Call] Failed to get media:", err);
      toast.error("Could not access camera/microphone: " + err.message);
      setCallAccepted(false);
    }
  };

  const leaveCall = () => {
    setCallEnded(true);

    // Stop all tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (otherUserStream) {
      otherUserStream.getTracks().forEach(track => track.stop());
      setOtherUserStream(null);
    }

    // Clean up peer connection
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    // Clear video elements
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    const socket = getSocket();
    const toId = incomingCall?.from || selectedChat?.userId;
    if (toId) socket?.emit("end_call", { to: toId });

    setCallActive(false);
    setCallAccepted(false);
    setIncomingCall(null);
    setOutgoingCall(null);
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

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedChat.userId,
          content: messageInput,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );

        if (socket) {
          socket.emit("send_message", {
            message: data.message,
            receiverId: selectedChat.userId,
          });
        }
      } else {
        // Remove failed message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error("Failed to send message");
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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    setUploadingMedia(true);
    try {
      // Convert to base64 (in production, upload to CDN)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        const message: Message = {
          id: Date.now().toString(),
          content: isImage ? "[Image]" : isVideo ? "[Video]" : `[File: ${file.name}]`,
          senderId: session?.user?.id || "",
          receiverId: selectedChat.userId,
          createdAt: new Date().toISOString(),
          read: false,
          type: isImage ? "image" : isVideo ? "video" : "file",
          imageUrl: isImage ? base64 : undefined,
          fileUrl: !isImage && !isVideo ? base64 : undefined,
          fileName: file.name,
          sender: {
            id: session?.user?.id || "",
            name: session?.user?.name || undefined,
            avatar: session?.user?.image || undefined,
          },
        };

        setMessages((prev) => [...prev, message]);
        scrollToBottom();

        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: selectedChat.userId,
            content: message.content,
            type: message.type,
            imageUrl: message.imageUrl,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? data.message : m))
          );
          const socket = getSocket();
          if (socket) {
            socket.emit("send_message", {
              message: data.message,
              receiverId: selectedChat.userId,
            });
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading media:", error);
      toast.error("Failed to upload media");
    } finally {
      setUploadingMedia(false);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)] lg:h-[calc(100vh-12rem)]">
            {/* Chat List - Enhanced Design */}
            <Card variant="elevated" className={`lg:col-span-1 overflow-hidden flex flex-col ${selectedChat ? "hidden lg:flex" : "flex"}`}>
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
              className={`lg:col-span-2 overflow-hidden flex flex-col ${!selectedChat ? "hidden lg:flex" : "flex"}`}
            >
              {selectedChat ? (
                <>
                  {/* Chat Header - Enhanced */}
                  <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-purple-600/10 to-blue-600/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedChat(null)}
                        className="lg:hidden"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <Link
                        href={`/profile/${selectedChat.user.username || selectedChat.userId}`}
                        className="flex items-center gap-3 hover:opacity-80 transition"
                      >
                        <RealTimeAvatar
                          userId={selectedChat.user.id}
                          src={selectedChat.user.avatar}
                          alt={selectedChat.user.name || "User"}
                          size="md"
                          status={selectedChat.user.status || "offline"}
                          alternativeIds={selectedChat.user.alternativeIds}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {selectedChat.user.name || "Unknown"}
                            </h3>
                            {selectedChat.user.verified && (
                              <Badge variant="success" className="text-xs">Verified</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${selectedChat.user.status === "online"
                                ? "bg-green-500 animate-pulse"
                                : selectedChat.user.status === "away"
                                  ? "bg-yellow-500"
                                  : "bg-muted-foreground"
                                }`}
                            />
                            <p className="text-sm text-muted-foreground">
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => callUser(selectedChat.userId, false)}
                        className="hover:bg-green-500/10"
                        title="Voice Call"
                      >
                        <Phone className="h-5 w-5 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => callUser(selectedChat.userId, true)}
                        className="hover:bg-blue-500/10"
                        title="Video Call"
                      >
                        <Video className="h-5 w-5 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages - Enhanced */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/50 custom-scrollbar">
                    <AnimatePresence>
                      {messages.map((message, index) => {
                        const isOwn = message.senderId === session?.user?.id;
                        const showAvatar = !isOwn && (
                          index === 0 ||
                          messages[index - 1]?.senderId !== message.senderId
                        );
                        const showTime =
                          index === messages.length - 1 ||
                          new Date(message.createdAt).getTime() -
                          new Date(messages[index + 1].createdAt).getTime() >
                          5 * 60 * 1000;

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showTime ? "mb-4" : ""
                              }`}
                          >
                            <div className={`flex items-end gap-2 max-w-[85%] lg:max-w-[75%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                              {showAvatar && !isOwn && (
                                <RealTimeAvatar
                                  userId={message.sender?.id}
                                  src={message.sender?.avatar}
                                  alt={message.sender?.name || "User"}
                                  size="sm"
                                  className="flex-shrink-0"
                                  // @ts-ignore
                                  alternativeIds={message.sender?.alternativeIds}
                                />
                              )}
                              {!showAvatar && !isOwn && <div className="w-8 flex-shrink-0" />}
                              <div className="flex flex-col gap-1">
                                {message.type === "image" && message.imageUrl && (
                                  <div className="rounded-2xl overflow-hidden max-w-xs">
                                    <img
                                      src={message.imageUrl}
                                      alt="Shared image"
                                      className="w-full h-auto cursor-pointer hover:opacity-90 transition"
                                      onClick={() => window.open(message.imageUrl, "_blank")}
                                    />
                                  </div>
                                )}
                                {message.type === "file" && (
                                  <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-400" />
                                    <span className="text-sm text-white truncate">
                                      {message.fileName || "File"}
                                    </span>
                                  </div>
                                )}
                                <div
                                  className={`rounded-2xl px-4 py-2.5 ${isOwn
                                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-md"
                                    : "bg-gray-800 text-gray-100 rounded-bl-md"
                                    }`}
                                >
                                  {message.type === "text" && (
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {formatMessageContent(message.content)}
                                    </p>
                                  )}
                                  <div
                                    className={`flex items-center gap-1 mt-1.5 text-xs ${isOwn ? "text-white/70" : "text-gray-400"
                                      }`}
                                  >
                                    <span>{formatTimeAgo(message.createdAt)}</span>
                                    {isOwn && (
                                      <span>
                                        {message.read ? (
                                          <CheckCheck className="h-3 w-3 text-blue-400" />
                                        ) : (
                                          <Check className="h-3 w-3" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Typing Indicator - Enhanced */}
                    {typingUsers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input - Enhanced */}
                  <div className="p-4 border-t border-gray-700/50 bg-gray-900/50">
                    <div className="flex items-end gap-2">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowMediaMenu(!showMediaMenu)}
                          className="hover:bg-purple-500/20"
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
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="flex-1 bg-gray-800/50 border-gray-700 focus:border-purple-500 min-h-[44px]"
                      />
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
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {uploadingMedia ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
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

      {/* Incoming Call Modal (Receiver) */}
      <AnimatePresence>
        {incomingCall && !callAccepted && callActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            {incomingCall.isVideo ? (
              /* INCOMING VIDEO CALL */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl border border-purple-500/50 p-8"
              >
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping blur-xl" />
                    <RealTimeAvatar
                      userId={incomingCall.from}
                      src={incomingCall.avatar}
                      size="xl"
                      className="w-32 h-32 relative z-10 border-4 border-purple-500/50 shadow-2xl"
                    />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">{incomingCall.name}</h2>
                  <p className="text-purple-400 font-medium animate-pulse mb-8">Incoming Video Call...</p>

                  <div className="flex gap-4">
                    <button
                      onClick={answerCall}
                      className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 hover:scale-110 transition-transform"
                    >
                      <Phone className="w-8 h-8" />
                    </button>
                    <button
                      onClick={leaveCall}
                      className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:scale-110 transition-transform"
                    >
                      <Phone className="w-8 h-8 rotate-[135deg]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* INCOMING AUDIO CALL */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0f111a] rounded-[3rem] border border-green-500/50 shadow-2xl overflow-hidden p-8 flex flex-col items-center justify-between min-h-[500px]"
              >
                <div className="flex flex-col items-center mt-10">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 border border-green-500/30 rounded-full animate-[ping_2s_linear_infinite]" />
                    <div className="absolute inset-0 border border-green-500/20 rounded-full animate-[ping_2s_linear_infinite_1s]" />
                    <RealTimeAvatar
                      userId={incomingCall.from}
                      src={incomingCall.avatar}
                      size="xl"
                      className="w-32 h-32 border-2 border-green-500/30 shadow-2xl relative z-10"
                    />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">{incomingCall.name}</h2>
                  <p className="text-green-400 font-medium animate-pulse">Incoming Voice Call...</p>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-8">
                  <button
                    onClick={answerCall}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 transition-transform group-hover:scale-110">
                      <Phone className="w-8 h-8 animate-pulse" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Accept</span>
                  </button>
                  <button
                    onClick={leaveCall}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-transform group-hover:scale-110">
                      <Phone className="w-8 h-8 rotate-[135deg]" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Decline</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outgoing Call Modal (Caller) */}
      <AnimatePresence>
        {outgoingCall && !callAccepted && callActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            {outgoingCall.isVideo ? (
              /* OUTGOING VIDEO CALL */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl border border-blue-500/50 p-8"
              >
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping blur-xl" />
                    <RealTimeAvatar
                      userId={outgoingCall.userId}
                      src={outgoingCall.userAvatar}
                      size="xl"
                      className="w-32 h-32 relative z-10 border-4 border-blue-500/50 shadow-2xl"
                    />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">{outgoingCall.userName || "User"}</h2>
                  <p className="text-blue-400 font-medium animate-pulse mb-8">Calling...</p>

                  <button
                    onClick={leaveCall}
                    className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:scale-110 transition-transform"
                  >
                    <Phone className="w-8 h-8 rotate-[135deg]" />
                  </button>
                </div>
              </motion.div>
            ) : (
              /* OUTGOING AUDIO CALL */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0f111a] rounded-[3rem] border border-green-500/50 shadow-2xl overflow-hidden p-8 flex flex-col items-center justify-between min-h-[500px]"
              >
                <div className="flex flex-col items-center mt-10">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 border border-green-500/30 rounded-full animate-[ping_2s_linear_infinite]" />
                    <div className="absolute inset-0 border border-green-500/20 rounded-full animate-[ping_2s_linear_infinite_1s]" />
                    <RealTimeAvatar
                      userId={outgoingCall.userId}
                      src={outgoingCall.userAvatar}
                      size="xl"
                      className="w-32 h-32 border-2 border-green-500/30 shadow-2xl relative z-10"
                    />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">{outgoingCall.userName || "User"}</h2>
                  <p className="text-green-400 font-medium animate-pulse">Calling...</p>
                </div>

                <button
                  onClick={leaveCall}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 hover:scale-110 transition-transform mb-8"
                >
                  <Phone className="w-8 h-8 rotate-[135deg]" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Call Modal (Both Connected) */}
      <AnimatePresence>
        {callActive && callAccepted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            {activeCallIsVideo ? (
              /* VIDEO CALL MODAL */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-6xl h-[90vh] bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800"
              >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

                <div className="absolute inset-0 flex flex-col p-6 z-10">
                  {/* Video Grid */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* My Stream */}
                    <div className="relative rounded-2xl overflow-hidden bg-gray-800 shadow-xl border border-gray-700/50 group">
                      <video
                        playsInline
                        muted
                        ref={myVideo}
                        autoPlay
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                      {!stream && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-medium border border-white/10 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        You
                      </div>
                    </div>

                    {/* Remote Stream */}
                    <div className="relative rounded-2xl overflow-hidden bg-gray-800 shadow-xl border border-gray-700/50">
                      <video
                        playsInline
                        ref={userVideo}
                        autoPlay
                        className="w-full h-full object-cover"
                      />
                      {!otherUserStream && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50 backdrop-blur-sm relative">
                          {/* Pulsing Avatar Effect */}
                          <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping blur-xl" />
                            <RealTimeAvatar
                              userId={selectedChat?.userId || ""}
                              src={selectedChat?.user.avatar}
                              size="xl"
                              className="w-32 h-32 relative z-10 border-4 border-blue-500/50 shadow-2xl"
                            />
                          </div>
                          <h3 className="mt-6 text-2xl font-bold text-white tracking-tight">
                            {selectedChat?.user.name || "User"}
                          </h3>
                          <p className="mt-2 text-blue-400 font-medium animate-pulse">
                            Connecting...
                          </p>
                        </div>
                      )}
                      {otherUserStream && (
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-medium border border-white/10 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          {selectedChat?.user.name || "User"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controls Bar */}
                  <div className="h-24 mt-6 flex items-center justify-center gap-6">
                    <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all duration-200 border border-gray-700 hover:border-gray-600 shadow-lg">
                      <Mic className="w-6 h-6" />
                    </button>

                    <button
                      onClick={leaveCall}
                      className="p-5 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all duration-200 shadow-xl shadow-red-600/20 hover:scale-105"
                    >
                      <Phone className="w-8 h-8 rotate-[135deg]" />
                    </button>

                    <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all duration-200 border border-gray-700 hover:border-gray-600 shadow-lg">
                      <Video className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* AUDIO CALL MODAL */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0f111a] rounded-[3rem] border border-gray-800 shadow-2xl overflow-hidden p-8 flex flex-col items-center justify-between min-h-[500px]"
              >
                {/* Visualizer Background */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]" />
                </div>

                <div className="relative z-10 flex flex-col items-center mt-10">
                  <div className="relative mb-8">
                    {/* Animated Rings */}
                    {(!callAccepted || incomingCall) && (
                      <>
                        <div className="absolute inset-0 border border-green-500/30 rounded-full animate-[ping_2s_linear_infinite]" />
                        <div className="absolute inset-0 border border-green-500/20 rounded-full animate-[ping_2s_linear_infinite_1s]" />
                      </>
                    )}

                    <RealTimeAvatar
                      userId={incomingCall ? incomingCall.from : selectedChat?.userId}
                      src={incomingCall ? incomingCall.avatar : selectedChat?.user.avatar}
                      size="xl"
                      className="w-32 h-32 border-2 border-green-500/30 shadow-2xl relative z-10"
                    />
                  </div>

                  <h2 className="text-3xl font-bold text-white mb-2 text-center">
                    {incomingCall ? incomingCall.name : selectedChat?.user.name}
                  </h2>
                  <p className={`text-sm font-medium tracking-wider uppercase ${callAccepted ? "text-gray-400" : "text-green-400 animate-pulse"}`}>
                    {callAccepted ? "Call in progress" : incomingCall ? "Incoming Call..." : "Calling..."}
                  </p>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-12 mb-8">
                  {incomingCall && !callAccepted && (
                    <button
                      onClick={answerCall}
                      className="flex flex-col items-center gap-3 group"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 transition-transform group-hover:scale-110">
                        <Phone className="w-8 h-8 animate-pulse" />
                      </div>
                      <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Accept</span>
                    </button>
                  )}

                  <button
                    onClick={leaveCall}
                    className="flex flex-col items-center gap-3 group col-span-2 mx-auto"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-transform group-hover:scale-110">
                      <Phone className="w-8 h-8 rotate-[135deg]" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">End</span>
                  </button>
                </div>

                {/* Hidden Video Elements for Audio Call Stream */}
                <div className="hidden">
                  {stream && <video playsInline muted ref={myVideo} autoPlay />}
                  <video playsInline ref={userVideo} autoPlay />
                </div>
              </motion.div>
            )}
          </motion.div>
        )
        }
      </AnimatePresence >
    </div >
  );
}
