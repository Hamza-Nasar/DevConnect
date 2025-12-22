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
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=YOUR_API_KEY&q=${encodeURIComponent(query)}&limit=12`
      ).catch(() => null);

      if (response?.ok) {
        const data = await response.json();
        setGifs(data.data.map((gif: any) => gif.images.fixed_height.url));
      } else {
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
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] md:hidden"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-800 p-4 md:absolute md:bottom-full md:left-0 md:right-auto md:mb-2 md:w-96 md:rounded-xl md:border md:p-4 md:z-50"
      >
        <div className="flex items-center justify-between mb-4 md:mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-1 md:hidden bg-gray-700 rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
            <h3 className="text-base md:text-sm font-semibold text-white">Select GIF</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-800 hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 h-11 md:h-10"
          />
        </div>

        {/* GIFs Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[40vh] md:max-h-64 overflow-y-auto custom-scrollbar no-scrollbar">
            {gifs.map((gif, index) => (
              <button
                key={index}
                onClick={() => handleGifClick(gif)}
                className="relative group rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition active:scale-95"
              >
                <img
                  src={gif}
                  alt={`GIF ${index + 1}`}
                  className="w-full h-32 md:h-24 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}


