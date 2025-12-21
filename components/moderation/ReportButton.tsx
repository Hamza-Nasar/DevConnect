"use client";

import { useState } from "react";
import { Flag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportButtonProps {
    type: "post" | "comment" | "user";
    targetId: string;
}

export default function ReportButton({ type, targetId }: ReportButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const reasons = [
        "Spam",
        "Harassment",
        "Hate Speech",
        "Inappropriate Content",
        "False Information",
        "Copyright Violation",
        "Other",
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/moderation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    targetId,
                    reason,
                    description: description.trim() || null,
                }),
            });

            if (res.ok) {
                alert("Report submitted. Thank you for keeping DevConnect safe!");
                setShowModal(false);
                setReason("");
                setDescription("");
            }
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("Failed to submit report");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(true)}
                className="text-gray-400 hover:text-red-400"
                title="Report"
            >
                <Flag className="w-4 h-4" />
            </Button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
                        <div className="flex items-center space-x-2 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                            <h2 className="text-xl font-bold text-white">Report {type}</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-300 mb-2">Reason *</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select a reason</option>
                                    {reasons.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-300 mb-2">Additional Details</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide more context (optional)"
                                    rows={3}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!reason || submitting}
                                    className="bg-red-500 hover:bg-red-600"
                                >
                                    {submitting ? "Submitting..." : "Submit Report"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}







