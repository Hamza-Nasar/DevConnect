"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Upload } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CreateGroupPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [avatar, setAvatar] = useState("");
    const [creating, setCreating] = useState(false);

    if (!session) {
        router.push("/login");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setCreating(true);
        try {
            const res = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    avatar: avatar || null,
                    isPublic,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/groups/${data.group.id}`);
            } else {
                alert("Failed to create group");
            }
        } catch (error) {
            console.error("Error creating group:", error);
            alert("Failed to create group");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card variant="elevated" className="p-8">
                    <h1 className="text-3xl font-bold mb-6 text-foreground">
                        Create Community
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-muted-foreground mb-2">Community Name *</label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter community name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-muted-foreground mb-2">Description</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your community..."
                                rows={4}
                                className="resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-muted-foreground mb-2">Visibility</label>
                            <div className="flex items-center space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(true)}
                                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition ${isPublic
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                        }`}
                                >
                                    <Globe className="w-5 h-5" />
                                    <span>Public</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(false)}
                                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition ${!isPublic
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                        }`}
                                >
                                    <Lock className="w-5 h-5" />
                                    <span>Private</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={creating || !name.trim()}
                                className="bg-primary text-primary-foreground"
                            >
                                {creating ? "Creating..." : "Create Community"}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}







