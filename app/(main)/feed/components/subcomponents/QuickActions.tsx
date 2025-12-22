"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Image as ImageIcon,
    Video,
    Hash,
    MapPin,
    Smile,
    FileImage,
    Link as LinkIcon,
    BarChart3 as PollIcon,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmojiPicker from "@/components/emoji/EmojiPicker";
import GifPicker from "@/components/gif/GifPicker";
import toast from "react-hot-toast";

interface QuickActionsProps {
    onMediaClick: () => void;
    onPollClick: () => void;
    onTagClick: () => void;
    location: string;
    setLocation: (loc: string) => void;
    showLocationPicker: boolean;
    setShowLocationPicker: (show: boolean) => void;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
    onEmojiSelect: (emoji: string) => void;
    showGifPicker: boolean;
    setShowGifPicker: (show: boolean) => void;
    onGifSelect: (url: string) => void;
    showLinkInput: boolean;
    setShowLinkInput: (show: boolean) => void;
    linkUrl: string;
    setLinkUrl: (url: string) => void;
    onLinkSubmit: (url: string) => void;
    postType: string;
}

function ActionButton({ icon: Icon, label, color, onClick, isActive }: any) {
    const colorClasses: Record<string, string> = {
        blue: "text-blue-400 group-hover:text-blue-300",
        red: "text-red-400 group-hover:text-red-300",
        purple: "text-purple-400 group-hover:text-purple-300",
        green: "text-green-400 group-hover:text-green-300",
        yellow: "text-yellow-400 group-hover:text-yellow-300",
        pink: "text-pink-400 group-hover:text-pink-300",
        cyan: "text-cyan-400 group-hover:text-cyan-300",
    };

    const borderClasses: Record<string, string> = {
        blue: "hover:border-blue-500/50",
        red: "hover:border-red-500/50",
        purple: "hover:border-purple-500/50",
        green: "hover:border-green-500/50",
        yellow: "hover:border-yellow-500/50",
        pink: "hover:border-pink-500/50",
        cyan: "hover:border-cyan-500/50",
    };

    const activeClasses: Record<string, string> = {
        blue: "bg-blue-600/20 border-blue-500/50",
        red: "bg-red-600/20 border-red-500/50",
        purple: "bg-purple-600/20 border-purple-500/50",
        green: "bg-green-600/20 border-green-500/50",
        yellow: "bg-yellow-600/20 border-yellow-500/50",
        pink: "bg-pink-600/20 border-pink-500/50",
        cyan: "bg-cyan-600/20 border-cyan-500/50",
    };

    return (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClick}
                className={`w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto border rounded-lg sm:rounded-xl transition-all group ${isActive ? activeClasses[color] : `bg-gray-800/30 hover:bg-gray-800/60 border-gray-700/50 ${borderClasses[color]}`
                    }`}
            >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? colorClasses[color].split(" ")[0] : colorClasses[color]}`} />
                <span className={`text-[10px] sm:text-xs ${isActive ? colorClasses[color].split(" ")[0] : "text-gray-400 group-hover:text-white"}`}>
                    {label}
                </span>
            </Button>
        </motion.div>
    );
}

export default function QuickActions({
    onMediaClick,
    onPollClick,
    onTagClick,
    location,
    setLocation,
    showLocationPicker,
    setShowLocationPicker,
    showEmojiPicker,
    setShowEmojiPicker,
    onEmojiSelect,
    showGifPicker,
    setShowGifPicker,
    onGifSelect,
    showLinkInput,
    setShowLinkInput,
    linkUrl,
    setLinkUrl,
    onLinkSubmit,
    postType,
}: QuickActionsProps) {
    const handleLocationClick = async () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const lat = position.coords.latitude.toFixed(4);
                        const lng = position.coords.longitude.toFixed(4);
                        setLocation(`📍 ${lat}, ${lng}`);
                        toast.success("Location added!");
                    } catch (error) {
                        setShowLocationPicker(true);
                    }
                },
                () => setShowLocationPicker(true)
            );
        } else {
            setShowLocationPicker(true);
        }
    };

    return (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-1.5 sm:gap-2">
            <ActionButton icon={ImageIcon} label="Photo" color="blue" onClick={onMediaClick} />
            <ActionButton icon={Video} label="Video" color="red" onClick={onMediaClick} />
            <ActionButton icon={PollIcon} label="Poll" color="purple" isActive={postType === "poll"} onClick={onPollClick} />
            <ActionButton icon={Hash} label="Tag" color="blue" onClick={onTagClick} />

            <div className="relative">
                <ActionButton icon={MapPin} label="Location" color="green" isActive={!!location} onClick={handleLocationClick} />
                {showLocationPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 sm:w-80 bg-gray-800 rounded-lg border border-gray-700 p-3 z-50 shadow-2xl">
                        <Input
                            type="text"
                            placeholder="Enter location..."
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && setShowLocationPicker(false)}
                            className="mb-2 bg-gray-700/50 border-gray-600"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => setShowLocationPicker(false)} className="flex-1">Done</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setLocation(""); setShowLocationPicker(false); }}>Clear</Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="relative">
                <ActionButton icon={Smile} label="Emoji" color="yellow" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                <AnimatePresence>
                    {showEmojiPicker && (
                        <EmojiPicker onSelect={(emoji) => { onEmojiSelect(emoji); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} />
                    )}
                </AnimatePresence>
            </div>

            <div className="relative">
                <ActionButton icon={FileImage} label="GIF" color="pink" onClick={() => setShowGifPicker(!showGifPicker)} />
                {showGifPicker && (
                    <GifPicker onSelect={(gifUrl) => { onGifSelect(gifUrl); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />
                )}
            </div>

            <div className="relative">
                <ActionButton icon={LinkIcon} label="Link" color="cyan" onClick={() => setShowLinkInput(!showLinkInput)} />
                {showLinkInput && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-gray-800 rounded-lg border border-gray-700 p-3 z-50 shadow-2xl">
                        <Input
                            type="url"
                            placeholder="Paste URL here..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && linkUrl && onLinkSubmit(linkUrl)}
                            className="mb-2 bg-gray-700/50 border-gray-600"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => linkUrl && onLinkSubmit(linkUrl)} className="flex-1">Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setLinkUrl(""); setShowLinkInput(false); }}>Cancel</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
