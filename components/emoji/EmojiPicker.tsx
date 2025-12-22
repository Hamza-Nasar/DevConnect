"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const EMOJI_CATEGORIES = {
  "😀": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗"],
  "❤️": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
  "👍": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👏", "🙌", "👐", "🤲", "🤝"],
  "🎉": ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸"],
  "🔥": ["🔥", "💯", "⭐", "🌟", "✨", "💫", "⚡", "☄️", "💥", "💢", "💤", "💨", "🌪️", "🌈", "☀️", "🌙", "⭐", "🌟"],
  "🍕": ["🍕", "🍔", "🍟", "🌭", "🍿", "🧂", "🥓", "🥚", "🍳", "🥞", "🥐", "🥨", "🧀", "🥗", "🥙", "🥪", "🌮", "🌯"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(Object.keys(EMOJI_CATEGORIES)[0]);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
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
        className="fixed bottom-0 left-0 right-0 z-[100] bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-800 p-4 md:absolute md:bottom-full md:left-0 md:right-auto md:mb-2 md:w-80 md:rounded-xl md:border md:rounded-t-xl md:p-4 md:z-50"
      >
        <div className="flex items-center justify-between mb-4 md:mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-1 md:hidden bg-gray-700 rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
            <h3 className="text-base md:text-sm font-semibold text-white">Select Emoji</h3>
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

        {/* Categories */}
        <div className="flex gap-2 mb-4 pb-2 border-b border-gray-800 overflow-x-auto no-scrollbar">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-xl transition ${selectedCategory === category
                  ? "bg-purple-600/20 text-purple-400"
                  : "hover:bg-gray-800 text-gray-400"
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emojis Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[40vh] md:max-h-48 overflow-y-auto custom-scrollbar">
          {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-3xl md:text-2xl h-12 w-12 md:h-10 md:w-10 flex items-center justify-center hover:bg-gray-800 rounded-xl transition active:scale-95 md:hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}


