"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Users, Lock, Globe, UserPlus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Group {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    isPublic: boolean;
    createdAt: string;
    _count?: {
        members: number;
        posts: number;
    };
}

interface GroupCardProps {
    group: Group;
    userRole?: string;
    isMember?: boolean;
}

export default function GroupCard({ group, userRole, isMember }: GroupCardProps) {
    const { data: session } = useSession();
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(isMember || false);

    const handleJoin = async () => {
        if (!session || joining) return;

        setJoining(true);
        try {
            const res = await fetch(`/api/groups/${group.id}/join`, {
                method: "POST",
            });

            if (res.ok) {
                setJoined(true);
            }
        } catch (error) {
            console.error("Error joining group:", error);
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:border-gray-600 transition">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                    {group.avatar ? (
                        <img
                            src={group.avatar}
                            alt={group.name}
                            className="w-16 h-16 rounded-xl object-cover"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                            {group.name[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="text-xl font-bold text-white">{group.name}</h3>
                            {group.isPublic ? (
                                <Globe className="w-4 h-4 text-green-400" />
                            ) : (
                                <Lock className="w-4 h-4 text-gray-400" />
                            )}
                        </div>
                        {group.description && (
                            <p className="text-gray-400 mt-1">{group.description}</p>
                        )}
                    </div>
                </div>

                {userRole === "admin" && (
                    <Link href={`/groups/${group.id}/settings`}>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                            <Settings className="w-5 h-5" />
                        </Button>
                    </Link>
                )}
            </div>

            <div className="flex items-center space-x-4 mb-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{group._count?.members || 0} members</span>
                </div>
                <div className="flex items-center space-x-1">
                    <span>{group._count?.posts || 0} posts</span>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Link href={`/groups/${group.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                        View Group
                    </Button>
                </Link>
                {session && !joined && group.isPublic && (
                    <Button
                        onClick={handleJoin}
                        disabled={joining}
                        className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {joining ? "Joining..." : "Join"}
                    </Button>
                )}
                {joined && (
                    <Button variant="outline" disabled className="opacity-50">
                        Member
                    </Button>
                )}
            </div>
        </div>
    );
}







