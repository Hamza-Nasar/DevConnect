"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PollEditorProps {
    pollOptions: string[];
    setPollOptions: (options: string[]) => void;
    pollDuration: number;
    setPollDuration: (duration: number) => void;
}

export default function PollEditor({
    pollOptions,
    setPollOptions,
    pollDuration,
    setPollDuration,
}: PollEditorProps) {
    const addPollOption = () => {
        if (pollOptions.length < 6) {
            setPollOptions([...pollOptions, ""]);
        }
    };

    const removePollOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2 p-3 sm:p-4 bg-gray-800/30 rounded-lg sm:rounded-xl border border-gray-700/50"
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Poll Options</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addPollOption}
                    disabled={pollOptions.length >= 6}
                    className="text-xs sm:text-sm w-full sm:w-auto"
                >
                    + Add Option
                </Button>
            </div>
            {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                    <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm sm:text-base bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {pollOptions.length > 2 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePollOption(index)}
                            className="h-9 w-9 sm:h-10 sm:w-10"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ))}
            <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Duration: {pollDuration} days</label>
                </div>
                <input
                    type="range"
                    min="1"
                    max="30"
                    value={pollDuration}
                    onChange={(e) => setPollDuration(Number(e.target.value))}
                    className="w-full accent-purple-500"
                />
            </div>
        </motion.div>
    );
}
