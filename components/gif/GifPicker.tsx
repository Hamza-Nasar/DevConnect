"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose?: () => void;
}

const TRENDING_GIFS = [
  "https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif",
  "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif",
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  "https://media.giphy.com/media/3o7abldb0k3r8K3Wso/giphy.gif",
  "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
  "https://media.giphy.com/media/3o7aD2sa0Xvhy5XWec/giphy.gif",
];

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<string[]>(TRENDING_GIFS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchGifs(searchQuery);
    } else {
      setGifs(TRENDING_GIFS);
    }
  }, [searchQuery]);

  const searchGifs = async (query: string) => {
    setIsLoading(true);
    try {
      // Using Giphy API (you can replace with your own API key)
      // For now, using a simple mock
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=YOUR_API_KEY&q=${encodeURIComponent(query)}&limit=12`
      ).catch(() => null);

      if (response?.ok) {
        const data = await response.json();
        setGifs(data.data.map((gif: any) => gif.images.fixed_height.url));
      } else {
        // Fallback to trending if API fails
        setGifs(TRENDING_GIFS);
      }
    } catch (error) {
      console.error("Error fetching GIFs:", error);
      setGifs(TRENDING_GIFS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGifClick = (gifUrl: string) => {
    onSelect(gifUrl);
    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute bottom-full left-0 mb-2 w-96 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-50 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">GIFs</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search GIFs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-700/50 border-gray-600"
        />
      </div>

      {/* GIFs Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
          {gifs.map((gif, index) => (
            <button
              key={index}
              onClick={() => handleGifClick(gif)}
              className="relative group rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition"
            >
              <img
                src={gif}
                alt={`GIF ${index + 1}`}
                className="w-full h-24 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}


