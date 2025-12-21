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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute bottom-full left-0 mb-2 w-80 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 z-50 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Emoji</h3>
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

      {/* Categories */}
      <div className="flex gap-1 mb-3 pb-2 border-b border-gray-700 overflow-x-auto">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-2 py-1 rounded-lg text-lg transition ${
              selectedCategory === category
                ? "bg-purple-600/20"
                : "hover:bg-gray-700"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emojis Grid */}
      <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
        {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="text-2xl hover:bg-gray-700 rounded-lg p-2 transition hover:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}


