"use client";

import { useState, useRef, DragEvent } from "react";
import { useSession } from "next-auth/react";
import { Image as ImageIcon, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DragDropPostProps {
    onPostCreated?: () => void;
}

export default function DragDropPost({ onPostCreated }: DragDropPostProps) {
    const { data: session } = useSession();
    const [content, setContent] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    if (!session) return null;

    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter((file) => file.type.startsWith("image/"));
        setImages((prev) => [...prev, ...imageFiles]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter((file) => file.type.startsWith("image/"));
        setImages((prev) => [...prev, ...imageFiles]);
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && images.length === 0) return;

        setUploading(true);
        try {
            // Convert files to base64 (in production, upload to CDN)
            const imagePromises = images.map((file) => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(file);
                });
            });

            const imageUrls = await Promise.all(imagePromises);

            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: content.trim(),
                    images: imageUrls,
                }),
            });

            if (res.ok) {
                setContent("");
                setImages([]);
                onPostCreated?.();
            }
        } catch (error) {
            console.error("Error creating post:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 transition ${
                    isDragging
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 hover:border-gray-500"
                }`}
            >
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind? (Drag & drop images here)"
                    rows={4}
                    className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none"
                />

                {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        {images.map((file, idx) => (
                            <div key={idx} className="relative group">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Preview ${idx + 1}`}
                                    className="w-full h-24 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition"
                        >
                            <ImageIcon className="w-5 h-5" />
                            <span>Add Photos</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={uploading || (!content.trim() && images.length === 0)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                        {uploading ? "Posting..." : "Post"}
                    </Button>
                </div>
            </div>
        </form>
    );
}







