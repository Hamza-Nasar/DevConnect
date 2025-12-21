"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Loader2, Camera, Upload, X, Check, Image as ImageIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import toast from "react-hot-toast";

const DEFAULT_AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bandit",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ginger",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sammy",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Coco",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bubba",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Missy"
];

export default function ProfileSetupPage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();

    const [formData, setFormData] = useState({
        username: "",
        name: "",
        bio: "",
        avatar: "",
    });
    const [loading, setLoading] = useState(false);

    // Modal & Camera State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("defaults");
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (session?.user) {
            setFormData(prev => ({
                ...prev,
                username: session.user.username || prev.username,
                name: session.user.name || prev.name,
                avatar: session.user.image || DEFAULT_AVATARS[0],
            }));
        }
    }, [status, session, router]);

    // Clean up camera stream when modal closes
    useEffect(() => {
        if (!isModalOpen) {
            stopCamera();
        }
    }, [isModalOpen]);

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 400, height: 400 }
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            setCameraError("Unable to access camera. Please check permissions.");
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext("2d");
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL("image/jpeg");
                setFormData({ ...formData, avatar: dataUrl });
                stopCamera();
                setIsModalOpen(false);
                toast.success("Photo captured!");
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast.error("Image size too large (max 2MB)");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setFormData(prev => ({ ...prev, avatar: result }));
                setIsModalOpen(false);
                toast.success("Image uploaded!");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.username || formData.username.length < 3) {
                toast.error("Username must be at least 3 characters");
                setLoading(false);
                return;
            }

            const res = await fetch("/api/profile-setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.username,
                    bio: formData.bio,
                    avatar: formData.avatar,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                // Also update name via settings API if changed
                if (formData.name !== session?.user?.name) {
                    await fetch("/api/settings/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: formData.name })
                    });
                }

                // Refresh session with new data to update the JWT token
                await updateSession({
                    user: {
                        username: formData.username,
                        name: formData.name,
                        image: formData.avatar,
                    }
                });
                toast.success("Profile setup complete!");
                // Force full navigation to feed to ensure all state is fresh
                window.location.href = "/feed";
            } else {
                toast.error(data.error || "Failed to update profile");
            }
        } catch (error) {
            console.error("Setup error:", error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Complete Your Profile</CardTitle>
                    <CardDescription className="text-center">
                        Personalize your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Avatar Section */}
                    <div className="flex justify-center mb-6">
                        <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
                            <Avatar className="h-24 w-24 ring-4 ring-secondary transition-all group-hover:ring-primary/50">
                                <AvatarImage src={formData.avatar} alt="Avatar" className="object-cover" />
                                <AvatarFallback className="bg-secondary text-2xl">
                                    {formData.username?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full border-2 border-background shadow-sm">
                                <Upload className="h-3 w-3" />
                            </div>
                        </div>
                        <p className="sr-only">Change profile picture</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    placeholder="username"
                                    className="pl-9"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Unique identifier, only letters, numbers, and underscores.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Nickname (Display Name)</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio (Optional)</Label>
                            <Input
                                id="bio"
                                placeholder="Tell us about yourself"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Finish Setup"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Avatar Selection Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Choose Profile Picture">
                <Tabs defaultValue="defaults" onValueChange={(val) => {
                    setActiveTab(val);
                    if (val === "camera") startCamera();
                    else stopCamera();
                }}>
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="defaults">Defaults</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                        <TabsTrigger value="camera">Camera</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Defaults */}
                    <TabsContent value="defaults" className="space-y-4">
                        <div className="grid grid-cols-4 gap-4 p-2 max-h-[300px] overflow-y-auto">
                            {DEFAULT_AVATARS.map((url, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, avatar: url });
                                        setIsModalOpen(false);
                                    }}
                                    className={`relative rounded-full overflow-hidden hover:ring-2 hover:ring-primary transition-all aspect-square ${formData.avatar === url ? "ring-2 ring-primary ring-offset-2" : ""}`}
                                >
                                    <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                                    {formData.avatar === url && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <Check className="h-6 w-6 text-primary font-bold drop-shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Tab 2: Upload */}
                    <TabsContent value="upload" className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 w-full text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="h-10 w-10 text-muted-foreground" />
                                <p className="text-sm font-medium">Click to Upload Image</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 2MB</p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 3: Camera */}
                    <TabsContent value="camera" className="flex flex-col items-center space-y-4">
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                            {cameraStream ? (
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="text-center p-4">
                                    {cameraError ? (
                                        <p className="text-destructive mb-2">{cameraError}</p>
                                    ) : (
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                                    )}
                                    {!cameraStream && !cameraError && <p className="text-muted-foreground">Starting camera...</p>}
                                    {cameraError && <Button onClick={startCamera} variant="outline" size="sm">Retry</Button>}
                                </div>
                            )}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="flex gap-4">
                            <Button variant="secondary" onClick={stopCamera}>Cancel</Button>
                            <Button onClick={capturePhoto} disabled={!cameraStream}>
                                <Camera className="mr-2 h-4 w-4" />
                                Capture
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </Modal>
        </div>
    );
}
