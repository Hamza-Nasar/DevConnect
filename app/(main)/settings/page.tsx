"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Settings,
  User,
  Bell,
  Lock,
  Shield,
  Palette,
  Globe,
  Mail,
  Eye,
  EyeOff,
  Save,
  Camera,
  X,
  Check,
  Sun,
  Moon,
  Flag,
  Zap,
  Volume2,
  Upload,
  Play,
  Pause,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useRef } from "react";
import getSocket from "@/lib/socket";
import { playToneByType } from "@/lib/soundUtils";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEnhancingBio, setIsEnhancingBio] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile Settings - Ensure all values are strings, never null/undefined
  const [profile, setProfile] = useState({
    name: session?.user?.name || "",
    username: "",
    bio: "",
    location: "",
    website: "",
    avatar: session?.user?.image || "",
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    isPrivate: false,
    showEmail: false,
    showLocation: true,
    allowMessages: true,
    allowFollowRequests: true,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
  });

  // Security Settings
  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
    activeSessions: [],
  });

  // Theme Settings
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Sound Settings
  const [soundSettings, setSoundSettings] = useState({
    incomingRingtone: "/sounds/ringtone.mp3",
    notificationTone: "gentle-bell",
    messageTone: "quick-beep",
    customRingtones: [] as string[],
  });
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [uploadingRingtone, setUploadingRingtone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
    // Load theme
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Load sound settings
    const savedIncomingRingtone = localStorage.getItem("user_ringtone") || "/sounds/ringtone.mp3";
    const savedNotificationTone = localStorage.getItem("notification_tone") || "gentle-bell";
    const savedMessageTone = localStorage.getItem("message_tone") || "quick-beep";
    const savedCustomRingtones = JSON.parse(localStorage.getItem("custom_ringtones") || "[]");

    setSoundSettings({
      incomingRingtone: savedIncomingRingtone,
      notificationTone: savedNotificationTone,
      messageTone: savedMessageTone,
      customRingtones: savedCustomRingtones,
    });
  }, [session]);

  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        // Ensure all profile values are strings (not null/undefined)
        if (data.profile) {
          setProfile({
            name: data.profile.name || "",
            username: data.profile.username || "",
            bio: data.profile.bio || "",
            location: data.profile.location || "",
            website: data.profile.website || "",
            avatar: data.profile.avatar || "",
          });
        }
        if (data.privacy) setPrivacy(data.privacy);
        if (data.notifications) setNotifications(data.notifications);
        if (data.security) setSecurity(data.security);
      } else {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = { error: "Failed to load settings" };
        }
        console.error("Error fetching settings:", errorData);
        if (res.status === 401) {
          toast.error("Please log in to view settings");
        } else {
          toast.error(errorData?.error || "Failed to load settings");
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        setAvatarPreview(base64Image);

        // Upload to server
        const res = await fetch("/api/settings/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...profile, avatar: base64Image }),
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({ ...profile, avatar: data.avatar || base64Image });

          // Update NextAuth session immediately to reflect changes everywhere
          await updateSession({
            user: {
              image: data.avatar || base64Image,
            },
          });

        // Emit real-time update
        const socket = getSocket();
        if (socket) {
          socket.emit("profile_updated", {
            userId: session?.user?.id,
            type: "avatar",
            avatar: data.avatar || base64Image,
          });
        }

          toast.success("Avatar updated successfully!");
        } else {
          toast.error("Failed to upload avatar");
          setAvatarPreview(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();

      if (res.ok) {
        // Update profile state with returned data
        if (data.profile) {
          setProfile({ ...profile, ...data.profile });
        }
        if (data.avatar) {
          setProfile({ ...profile, avatar: data.avatar });
        }

        // Update NextAuth session immediately
        await updateSession({
          user: {
            name: data.profile?.name || profile.name,
            image: data.avatar || data.profile?.avatar || profile.avatar,
          },
        });

        // Emit real-time update
        const socket = getSocket();
        if (socket) {
          socket.emit("profile_updated", {
            userId: session?.user?.id,
            type: "profile",
            profile: data.profile || data,
          });
        }

        toast.success("Profile updated successfully!");
      } else {
        // Show specific error message from API
        toast.error(data.error || "Failed to update profile");
        console.error("Profile update error:", data);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(privacy),
      });

      if (res.ok) {
        // Emit real-time update
        const socket = getSocket();
        if (socket) {
          socket.emit("settings_updated", {
            userId: session?.user?.id,
            type: "privacy",
            settings: privacy,
          });
        }
        toast.success("Privacy settings updated!");
      }
    } catch (error) {
      console.error("Error updating privacy:", error);
      toast.error("Failed to update privacy settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });

      if (res.ok) {
        // Emit real-time update
        const socket = getSocket();
        if (socket) {
          socket.emit("settings_updated", {
            userId: session?.user?.id,
            type: "notifications",
            settings: notifications,
          });
        }
        toast.success("Notification settings updated!");
      }
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Failed to update notification settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const currentPassword = (document.getElementById("currentPassword") as HTMLInputElement)?.value;
    const newPassword = (document.getElementById("newPassword") as HTMLInputElement)?.value;
    const confirmPassword = (document.getElementById("confirmPassword") as HTMLInputElement)?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Password changed successfully!");
        // Clear form
        (document.getElementById("currentPassword") as HTMLInputElement).value = "";
        (document.getElementById("newPassword") as HTMLInputElement).value = "";
        (document.getElementById("confirmPassword") as HTMLInputElement).value = "";
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleEnhanceBio = async () => {
    if (!profile.bio.trim()) {
      toast.error("Please enter a bio first");
      return;
    }

    setIsEnhancingBio(true);
    try {
      const res = await fetch("/api/ai/enhance-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: profile.bio }),
      });

      if (!res.ok) throw new Error("Failed to enhance bio");

      const data = await res.json();
      if (data.enhanced) {
        setProfile({ ...profile, bio: data.enhanced });
        toast.success("Bio enhanced with AI! ✨");
      }
    } catch (error) {
      console.error("Error enhancing bio:", error);
      toast.error("AI enhancement failed. Please try again.");
    } finally {
      setIsEnhancingBio(false);
    }
  };

  // Sound Settings Functions
  const playTone = (toneType: string) => {
    if (playingSound === toneType) {
      setPlayingSound(null);
      return;
    }

    setPlayingSound(toneType);
    playToneByType(toneType);

    // Set timeout to stop playing indicator
    setTimeout(() => setPlayingSound(null), 2500);
  };

  const playSound = (soundUrl: string) => {
    if (playingSound === soundUrl) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingSound(null);
      return;
    }

    // Stop any currently playing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Try to play the audio file first
    const audio = new Audio(soundUrl);
    audio.loop = true; // Loop for preview
    audio.volume = 0.5; // Lower volume for preview

    audio.onended = () => {
      setPlayingSound(null);
    };

    audio.play().then(() => {
      audioRef.current = audio;
      setPlayingSound(soundUrl);
    }).catch(() => {
      // If audio file fails to load, use generated tone
      console.log('Audio file not found, using generated tone');
      if (soundUrl.includes('ringtone.mp3')) {
        playTone('normal-ring');
      } else {
        playTone('whatsapp-connecting');
      }
    });
  };

  const handleToneChange = (type: "incoming" | "notification" | "message", value: string) => {
    setSoundSettings(prev => ({
      ...prev,
      [type === "incoming" ? "incomingRingtone" : type === "notification" ? "notificationTone" : "messageTone"]: value
    }));
  };

  const handleCustomRingtoneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Audio file size must be less than 5MB");
      return;
    }

    setUploadingRingtone(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Audio = e.target?.result as string;

        // Save to localStorage for now (in production, you'd upload to server)
        const customRingtones = [...soundSettings.customRingtones, base64Audio];
        localStorage.setItem("custom_ringtones", JSON.stringify(customRingtones));

        setSoundSettings(prev => ({
          ...prev,
          customRingtones: customRingtones
        }));

        toast.success("Custom ringtone uploaded successfully!");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading ringtone:", error);
      toast.error("Failed to upload ringtone");
    } finally {
      setUploadingRingtone(false);
    }
  };

  const handleSaveSoundSettings = () => {
    // Save to localStorage
    localStorage.setItem("user_ringtone", soundSettings.incomingRingtone);
    localStorage.setItem("notification_tone", soundSettings.notificationTone);
    localStorage.setItem("message_tone", soundSettings.messageTone);
    localStorage.setItem("custom_ringtones", JSON.stringify(soundSettings.customRingtones));

    toast.success("Sound settings saved successfully!");
  };

  const removeCustomRingtone = (index: number) => {
    const updatedRingtones = soundSettings.customRingtones.filter((_, i) => i !== index);
    setSoundSettings(prev => ({
      ...prev,
      customRingtones: updatedRingtones
    }));
    localStorage.setItem("custom_ringtones", JSON.stringify(updatedRingtones));
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          {/* Tabs - Mobile Responsive */}
          <Tabs defaultValue="profile" className="mb-6">
            <TabsList className="flex w-full overflow-x-auto scrollbar-hide gap-1 p-1 bg-gray-800/30 rounded-xl border border-gray-700/30 mobile-tabs-scroll">
              <TabsTrigger value="profile" className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0 whitespace-nowrap">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Profile</span>
                <span className="sm:hidden">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0 whitespace-nowrap">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Privacy</span>
                <span className="sm:hidden">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0 whitespace-nowrap">
                <Bell className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Notifications</span>
                <span className="sm:hidden">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0 whitespace-nowrap">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Security</span>
                <span className="sm:hidden">Security</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0 whitespace-nowrap">
                <Palette className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Appearance</span>
                <span className="sm:hidden">Theme</span>
              </TabsTrigger>
              <TabsTrigger value="sounds" className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0 whitespace-nowrap">
                <Volume2 className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Sounds</span>
                <span className="sm:hidden">Audio</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Profile Information</h3>
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <RealTimeAvatar
                        userId={session?.user?.id}
                        src={avatarPreview || profile.avatar}
                        alt={profile.name}
                        size="xl"
                        className="ring-2 ring-primary/50"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Change Avatar
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG or GIF. Max size 2MB
                      </p>
                      {avatarPreview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAvatarPreview(null);
                            if (avatarInputRef.current) {
                              avatarInputRef.current.value = "";
                            }
                          }}
                          className="mt-2 text-destructive hover:text-destructive/80"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Full Name
                    </label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="bg-secondary/50 border-input"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Username
                    </label>
                    <Input
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      className="bg-secondary/50 border-input"
                      placeholder="username"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-muted-foreground">
                        Bio
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEnhanceBio}
                        disabled={isEnhancingBio || !profile.bio.trim()}
                        className="h-8 text-[10px] sm:text-xs text-primary hover:text-primary/80 hover:bg-primary/10 gap-1.5"
                      >
                        {isEnhancingBio ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                        ) : (
                          <Zap className="h-3 w-3" />
                        )}
                        <span>AI Enhance</span>
                      </Button>
                    </div>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="bg-secondary/50 border-input min-h-[100px]"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Location
                    </label>
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="bg-secondary/50 border-input"
                      placeholder="City, Country"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Website
                    </label>
                    <Input
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      className="bg-secondary/50 border-input"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full text-sm sm:text-base"
                  >
                    <Save className="h-4 w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span>Save Changes</span>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Privacy Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Private Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Only approved followers can see your posts
                      </p>
                    </div>
                    <Switch
                      checked={privacy.isPrivate}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, isPrivate: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Show Email</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow others to see your email address
                      </p>
                    </div>
                    <Switch
                      checked={privacy.showEmail}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, showEmail: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Show Location</h4>
                      <p className="text-sm text-muted-foreground">
                        Display your location on your profile
                      </p>
                    </div>
                    <Switch
                      checked={privacy.showLocation}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, showLocation: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Allow Messages</h4>
                      <p className="text-sm text-muted-foreground">
                        Let others send you direct messages
                      </p>
                    </div>
                    <Switch
                      checked={privacy.allowMessages}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, allowMessages: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Follow Requests</h4>
                      <p className="text-sm text-muted-foreground">
                        Require approval for new followers
                      </p>
                    </div>
                    <Switch
                      checked={privacy.allowFollowRequests}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, allowFollowRequests: checked })
                      }
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleSavePrivacy}
                    disabled={loading}
                    className="w-full text-sm sm:text-base"
                  >
                    <Save className="h-4 w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Save Privacy Settings</span>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Notification Preferences</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Push Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive push notifications</p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, push: checked })
                      }
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-semibold text-foreground mb-4">What to notify me about</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Likes</span>
                        <Switch
                          checked={notifications.likes}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, likes: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Comments</span>
                        <Switch
                          checked={notifications.comments}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, comments: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">New Followers</span>
                        <Switch
                          checked={notifications.follows}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, follows: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mentions</span>
                        <Switch
                          checked={notifications.mentions}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, mentions: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Messages</span>
                        <Switch
                          checked={notifications.messages}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, messages: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleSaveNotifications}
                    disabled={loading}
                    className="w-full text-sm sm:text-base"
                  >
                    <Save className="h-4 w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Save Notification Settings</span>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Security Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(checked) =>
                        setSecurity({ ...security, twoFactor: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Login Alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified when someone logs into your account
                      </p>
                    </div>
                    <Switch
                      checked={security.loginAlerts}
                      onCheckedChange={(checked) =>
                        setSecurity({ ...security, loginAlerts: checked })
                      }
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-semibold text-foreground mb-4">Active Sessions</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div>
                          <p className="text-foreground font-medium">Current Session</p>
                          <p className="text-sm text-muted-foreground">Windows • Chrome • Now</p>
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-foreground">Account Verification</h4>
                      <Link href="/settings/verification">
                        <Button variant="outline" size="sm">
                          Verify Email/Phone
                        </Button>
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get a verified badge to show that your account is authentic.
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-4">Change Password</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          id="currentPassword"
                          className="bg-secondary/50 border-input pr-10"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        New Password
                      </label>
                      <Input
                        type="password"
                        id="newPassword"
                        className="bg-secondary/50 border-input"
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        id="confirmPassword"
                        className="bg-secondary/50 border-input"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleChangePassword}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Support Tab (New) */}
            <TabsContent value="support" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Help & Support</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Report a Problem</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Found a bug or have a suggestion? Let us know.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Subject
                        </label>
                        <select
                          className="w-full px-4 py-2 bg-secondary/50 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option>Bug Report</option>
                          <option>Feature Request</option>
                          <option>Harassment/Abuse</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Description
                        </label>
                        <Textarea
                          className="bg-secondary/50 border-input min-h-[150px]"
                          placeholder="Describe the issue in detail..."
                        />
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => {
                          toast.success("Report submitted successfully! We will review it shortly.");
                        }}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Submit Report
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h4 className="font-semibold text-foreground mb-2">Contact Us</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Need direct assistance? Email our support team.
                    </p>
                    <a href="mailto:support@devconnect.com" className="text-primary hover:underline flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      support@devconnect.com
                    </a>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Appearance Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">Theme</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose between light and dark mode
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        variant={theme === "light" ? "primary" : "outline"}
                        size="sm"
                        onClick={() => handleThemeChange("light")}
                      >
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "primary" : "outline"}
                        size="sm"
                        onClick={() => handleThemeChange("dark")}
                      >
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      Your theme preference is saved locally and will persist across sessions.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Sounds Tab */}
            <TabsContent value="sounds" className="mt-6">
              <Card variant="elevated" className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">Sound Settings</h3>
                <div className="space-y-8">
                  {/* Incoming Call Ringtone */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-4">Incoming Call Ringtone</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Ringtone 1 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Classic Ring</p>
                            <p className="text-sm text-muted-foreground">Traditional telephone ring</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playToneByType('normal-ring')}
                            disabled={playingSound === 'normal-ring'}
                          >
                            {playingSound === 'normal-ring' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="normal-ring"
                            checked={soundSettings.incomingRingtone === "normal-ring"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 2 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Crystal Bell</p>
                            <p className="text-sm text-muted-foreground">Elegant crystal bell</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('crystal-bell')}
                            disabled={playingSound === 'crystal-bell'}
                          >
                            {playingSound === 'crystal-bell' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="crystal-bell"
                            checked={soundSettings.incomingRingtone === "crystal-bell"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 3 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Melody Chime</p>
                            <p className="text-sm text-muted-foreground">Musical chime melody</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('melody-chime')}
                            disabled={playingSound === 'melody-chime'}
                          >
                            {playingSound === 'melody-chime' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="melody-chime"
                            checked={soundSettings.incomingRingtone === "melody-chime"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 4 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Gentle Bell</p>
                            <p className="text-sm text-muted-foreground">Soft gentle bell</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('gentle-bell')}
                            disabled={playingSound === 'gentle-bell'}
                          >
                            {playingSound === 'gentle-bell' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="gentle-bell"
                            checked={soundSettings.incomingRingtone === "gentle-bell"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 5 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">🌟 Digital Pulse</p>
                            <p className="text-sm text-muted-foreground">Modern digital pulse</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('digital-pulse')}
                            disabled={playingSound === 'digital-pulse'}
                          >
                            {playingSound === 'digital-pulse' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="digital-pulse"
                            checked={soundSettings.incomingRingtone === "digital-pulse"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 6 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Piano Note</p>
                            <p className="text-sm text-muted-foreground">Elegant piano melody</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('piano-note')}
                            disabled={playingSound === 'piano-note'}
                          >
                            {playingSound === 'piano-note' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="piano-note"
                            checked={soundSettings.incomingRingtone === "piano-note"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 7 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Quick Beep</p>
                            <p className="text-sm text-muted-foreground">Fast notification beep</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('quick-beep')}
                            disabled={playingSound === 'quick-beep'}
                          >
                            {playingSound === 'quick-beep' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="quick-beep"
                            checked={soundSettings.incomingRingtone === "quick-beep"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 8 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Nature Chime</p>
                            <p className="text-sm text-muted-foreground">Peaceful nature sound</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('nature-chime')}
                            disabled={playingSound === 'nature-chime'}
                          >
                            {playingSound === 'nature-chime' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="nature-chime"
                            checked={soundSettings.incomingRingtone === "nature-chime"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 9 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Trumpet Call</p>
                            <p className="text-sm text-muted-foreground">Classic trumpet fanfare</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('trumpet-call')}
                            disabled={playingSound === 'trumpet-call'}
                          >
                            {playingSound === 'trumpet-call' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="trumpet-call"
                            checked={soundSettings.incomingRingtone === "trumpet-call"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Ringtone 10 */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Orchestra Hit</p>
                            <p className="text-sm text-muted-foreground">Dramatic orchestra sting</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('orchestra-hit')}
                            disabled={playingSound === 'orchestra-hit'}
                          >
                            {playingSound === 'orchestra-hit' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="incoming-ringtone"
                            value="orchestra-hit"
                            checked={soundSettings.incomingRingtone === "orchestra-hit"}
                            onChange={(e) => handleToneChange("incoming", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      {/* Custom Ringtones */}
                      {soundSettings.customRingtones.map((ringtone, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Volume2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-foreground font-medium">Custom Ringtone {index + 1}</p>
                              <p className="text-sm text-muted-foreground">Uploaded by you</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playSound(ringtone)}
                              disabled={playingSound === ringtone}
                            >
                              {playingSound === ringtone ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <input
                              type="radio"
                              name="incoming-ringtone"
                              value={ringtone}
                              checked={soundSettings.incomingRingtone === ringtone}
                              onChange={(e) => handleToneChange("incoming", e.target.value)}
                              className="w-4 h-4 text-primary"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomRingtone(index)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>


                  {/* Notification Tone */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-4">Notification Tone</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Notification Tone Options */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Gentle Bell</p>
                            <p className="text-sm text-muted-foreground">Soft notification bell</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('gentle-bell')}
                            disabled={playingSound === 'gentle-bell'}
                          >
                            {playingSound === 'gentle-bell' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="notification-tone"
                            value="gentle-bell"
                            checked={soundSettings.notificationTone === "gentle-bell"}
                            onChange={(e) => handleToneChange("notification", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Quick Beep</p>
                            <p className="text-sm text-muted-foreground">Fast notification beep</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('quick-beep')}
                            disabled={playingSound === 'quick-beep'}
                          >
                            {playingSound === 'quick-beep' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="notification-tone"
                            value="quick-beep"
                            checked={soundSettings.notificationTone === "quick-beep"}
                            onChange={(e) => handleToneChange("notification", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Crystal Bell</p>
                            <p className="text-sm text-muted-foreground">Elegant crystal tone</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('crystal-bell')}
                            disabled={playingSound === 'crystal-bell'}
                          >
                            {playingSound === 'crystal-bell' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="notification-tone"
                            value="crystal-bell"
                            checked={soundSettings.notificationTone === "crystal-bell"}
                            onChange={(e) => handleToneChange("notification", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">🌟 Digital Pulse</p>
                            <p className="text-sm text-muted-foreground">Modern digital pulse</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('digital-pulse')}
                            disabled={playingSound === 'digital-pulse'}
                          >
                            {playingSound === 'digital-pulse' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="notification-tone"
                            value="digital-pulse"
                            checked={soundSettings.notificationTone === "digital-pulse"}
                            onChange={(e) => handleToneChange("notification", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message Tone */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-4">Message Tone</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Message Tone Options */}
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Quick Beep</p>
                            <p className="text-sm text-muted-foreground">Fast message notification</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('quick-beep')}
                            disabled={playingSound === 'quick-beep'}
                          >
                            {playingSound === 'quick-beep' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="message-tone"
                            value="quick-beep"
                            checked={soundSettings.messageTone === "quick-beep"}
                            onChange={(e) => handleToneChange("message", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Melody Chime</p>
                            <p className="text-sm text-muted-foreground">Musical message tone</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('melody-chime')}
                            disabled={playingSound === 'melody-chime'}
                          >
                            {playingSound === 'melody-chime' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="message-tone"
                            value="melody-chime"
                            checked={soundSettings.messageTone === "melody-chime"}
                            onChange={(e) => handleToneChange("message", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Gentle Bell</p>
                            <p className="text-sm text-muted-foreground">Soft message bell</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('gentle-bell')}
                            disabled={playingSound === 'gentle-bell'}
                          >
                            {playingSound === 'gentle-bell' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="message-tone"
                            value="gentle-bell"
                            checked={soundSettings.messageTone === "gentle-bell"}
                            onChange={(e) => handleToneChange("message", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">Nature Chime</p>
                            <p className="text-sm text-muted-foreground">Peaceful message sound</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTone('nature-chime')}
                            disabled={playingSound === 'nature-chime'}
                          >
                            {playingSound === 'nature-chime' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <input
                            type="radio"
                            name="message-tone"
                            value="nature-chime"
                            checked={soundSettings.messageTone === "nature-chime"}
                            onChange={(e) => handleToneChange("message", e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Custom Ringtone */}
                  <div className="border-t border-border pt-6">
                    <h4 className="font-semibold text-foreground mb-4">Upload Custom Ringtone</h4>
                    <div className="space-y-4">
                      <div>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleCustomRingtoneUpload}
                          className="hidden"
                          id="ringtone-upload"
                          disabled={uploadingRingtone}
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={uploadingRingtone}
                          onClick={() => document.getElementById('ringtone-upload')?.click()}
                        >
                          {uploadingRingtone ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Custom Ringtone
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Supported formats: MP3, WAV, OGG. Max size: 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleSaveSoundSettings}
                    className="w-full text-sm sm:text-base"
                  >
                    <Save className="h-4 w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span>Save Sound Settings</span>
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div >
  );
}


