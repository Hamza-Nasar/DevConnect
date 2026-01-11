"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import getSocket from "@/lib/socket";
import SimplePeer from "simple-peer";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, X, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface CallContextType {
    callActive: boolean;
    incomingCall: any;
    outgoingCall: any;
    callAccepted: boolean;
    callEnded: boolean;
    stream: MediaStream | null;
    otherUserStream: MediaStream | null;
    callUser: (userId: string, userName: string, userAvatar: string, isVideo: boolean) => void;
    answerCall: () => void;
    leaveCall: () => void;
    muteMicrophone: () => void;
    toggleVideo: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error("useCall must be used within a CallProvider");
    }
    return context;
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
    const { data: session } = useSession();
    const [callActive, setCallActive] = useState(false);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [outgoingCall, setOutgoingCall] = useState<any>(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [otherUserStream, setOtherUserStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const myVideo = useRef<HTMLVideoElement>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<any>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const callingSoundRef = useRef<HTMLAudioElement | null>(null);

    // Initialize sounds
    useEffect(() => {
        if (typeof window === "undefined" || !window?.document) return;

        // Get user incoming ringtone preference from localStorage
        const userRingtone = localStorage.getItem("user_ringtone") || "normal-ring";

        // Use generated tones for both incoming and outgoing
        ringtoneRef.current = null; // Will use generated tones
        callingSoundRef.current = null; // Will use generated tones
    }, []);

    useEffect(() => {
        if (!session?.user?.id) return;

        const socket = getSocket();
        if (!socket) return;

        socket.on("call_user", (data: any) => {
            console.log("📞 [Global] Incoming Call Event:", data);
            if (data.from == session.user.id) return; // Prevent self-call handling

            setIncomingCall({
                isReceivingCall: true,
                from: data.from,
                name: data.name || "Unknown",
                avatar: data.avatar,
                signal: data.signal,
                isVideo: data.isVideo ?? true,
            });
            setCallActive(true);
        });

        socket.on("call_accepted", (signal: any) => {
            console.log("✅ [Global] Call Accepted");
            setCallAccepted(true);
            if (connectionRef.current) {
                connectionRef.current.signal(signal);
            }
        });

        socket.on("call_ended", () => {
            console.log("📴 [Global] Call Ended by other user");
            resetCall();
        });

        return () => {
            socket.off("call_user");
            socket.off("call_accepted");
            socket.off("call_ended");
        };
    }, [session?.user?.id]);

    // Tone generation functions
    const generateTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);

        return audioContext;
    };

    const playIncomingRingtone = () => {
        const userRingtone = localStorage.getItem("user_ringtone") || "normal-ring";

        switch (userRingtone) {
            case 'normal-ring':
                setTimeout(() => generateTone(800, 0.5), 0);
                setTimeout(() => generateTone(800, 0.5), 600);
                setTimeout(() => generateTone(800, 0.5), 1200);
                setTimeout(() => generateTone(800, 0.5), 1800);
                break;
            case 'crystal-bell':
                generateTone(1046, 0.8, 'sine');
                setTimeout(() => generateTone(1318, 0.8, 'sine'), 300);
                break;
            case 'gentle-bell':
                generateTone(523, 1, 'triangle');
                setTimeout(() => generateTone(659, 1, 'triangle'), 200);
                break;
            default:
                // Default to normal ring
                setTimeout(() => generateTone(800, 0.5), 0);
                setTimeout(() => generateTone(800, 0.5), 600);
        }
    };

    const playOutgoingTone = () => {
        // Simple smooth connecting tone
        let interval = setInterval(() => {
            generateTone(440, 0.15, 'sine');
        }, 300);
        return interval;
    };

    // Sound management
    useEffect(() => {
        if (typeof window === "undefined") return;

        let outgoingInterval: NodeJS.Timeout | null = null;

        // Incoming Call Ringtone
        if (incomingCall && !callAccepted && !callEnded) {
            // Play ringtone every 2 seconds
            const ringInterval = setInterval(() => {
                playIncomingRingtone();
            }, 2000);

            // Store interval for cleanup
            (window as any).ringInterval = ringInterval;
        } else {
            // Stop incoming ringtone
            if ((window as any).ringInterval) {
                clearInterval((window as any).ringInterval);
                (window as any).ringInterval = null;
            }
        }

        // Outgoing Call Sound
        if (outgoingCall && !callAccepted && !callEnded) {
            outgoingInterval = playOutgoingTone();
            (window as any).outgoingInterval = outgoingInterval;
        } else {
            // Stop outgoing tone
            if ((window as any).outgoingInterval) {
                clearInterval((window as any).outgoingInterval);
                (window as any).outgoingInterval = null;
            }
        }

        return () => {
            if ((window as any).ringInterval) {
                clearInterval((window as any).ringInterval);
            }
            if ((window as any).outgoingInterval) {
                clearInterval((window as any).outgoingInterval);
            }
        };
    }, [incomingCall, outgoingCall, callAccepted, callEnded]);

    const callUser = async (userId: string, userName: string, userAvatar: string, isVideo: boolean) => {
        const socket = getSocket();
        if (!socket || !session?.user?.id) return;

        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: true,
            });
            setStream(currentStream);
            setOutgoingCall({ userId, userName, userAvatar, isVideo });
            setCallActive(true);

            const peer = new SimplePeer({
                initiator: true,
                trickle: false,
                stream: currentStream,
            });

            peer.on("signal", (data: any) => {
                socket.emit("call_user", {
                    userToCall: userId,
                    signalData: data,
                    from: session.user.id,
                    name: session.user.name || "User",
                    avatar: session.user.image || "",
                    isVideo: isVideo,
                });
            });

            peer.on("stream", (remoteStream: MediaStream) => {
                setOtherUserStream(remoteStream);
            });

            connectionRef.current = peer;
        } catch (err) {
            console.error("Failed to get local stream", err);
        }
    };

    const answerCall = async () => {
        const socket = getSocket();
        if (!socket || !incomingCall) return;

        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({
                video: incomingCall.isVideo,
                audio: true,
            });
            setStream(currentStream);
            setCallAccepted(true);

            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: currentStream,
            });

            peer.on("signal", (data: any) => {
                socket.emit("answer_call", { signal: data, to: incomingCall.from });
            });

            peer.on("stream", (remoteStream: MediaStream) => {
                setOtherUserStream(remoteStream);
            });

            peer.signal(incomingCall.signal);
            connectionRef.current = peer;
        } catch (err) {
            console.error("Failed to answer call", err);
        }
    };

    const leaveCall = () => {
        const socket = getSocket();
        if (socket) {
            const targetId = incomingCall?.from || outgoingCall?.userId;
            if (targetId) {
                socket.emit("end_call", { to: targetId });
            }
        }
        resetCall();
    };

    const resetCall = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        setStream(null);
        setOtherUserStream(null);
        setCallActive(false);
        setIncomingCall(null);
        setOutgoingCall(null);
        setCallAccepted(false);
        setCallEnded(false);
        setIsMuted(false);
        setIsVideoOff(false);
        connectionRef.current = null;
    };

    const muteMicrophone = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <CallContext.Provider
            value={{
                callActive,
                incomingCall,
                outgoingCall,
                callAccepted,
                callEnded,
                stream,
                otherUserStream,
                callUser,
                answerCall,
                leaveCall,
                muteMicrophone,
                toggleVideo,
                isMuted,
                isVideoOff,
            }}
        >
            {children}
            <AnimatePresence>
                {callActive && (
                    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
                        {/* Incoming Call Notification (Top-Right Card) */}
                        {incomingCall && !callAccepted && (
                            <motion.div
                                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                className="pointer-events-auto absolute top-4 right-4 w-full max-w-sm p-4 bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex items-center gap-3"
                            >
                                <div className="relative">
                                    <Avatar className="w-14 h-14 border-2 border-[#3b82f6]">
                                        <img src={incomingCall.avatar || "/default-avatar.png"} alt={incomingCall.name} />
                                    </Avatar>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 rounded-full border-4 border-[#3b82f6]"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold truncate text-sm">{incomingCall.name}</h3>
                                    <p className="text-white/60 text-xs">Incoming {incomingCall.isVideo ? "Video" : "Voice"} Call</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={leaveCall}
                                        variant="danger"
                                        size="icon"
                                        className="w-10 h-10 rounded-full shadow-lg shadow-red-500/20 flex-shrink-0"
                                    >
                                        <PhoneOff className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        onClick={answerCall}
                                        className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 flex-shrink-0"
                                    >
                                        {incomingCall.isVideo ? <Video className="w-4 h-4 text-white" /> : <Phone className="w-4 h-4 text-white" />}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Outgoing Call Screen (Compact & Clean) */}
                        {outgoingCall && !callAccepted && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="pointer-events-auto text-center space-y-6 p-8 bg-[#000]/90 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl w-full max-w-sm mx-4"
                            >
                                <div className="relative inline-block">
                                    <Avatar className="w-24 h-24 border-4 border-[#3b82f6]/50 shadow-2xl shadow-[#3b82f6]/20">
                                        <img src={outgoingCall.userAvatar || "/default-avatar.png"} alt={outgoingCall.userName} />
                                    </Avatar>
                                    <motion.div
                                        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                        className="absolute -inset-3 rounded-full border-2 border-[#3b82f6]"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                                        className="absolute -inset-3 rounded-full border-2 border-[#3b82f6]/50"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{outgoingCall.userName}</h2>
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
                                        <p className="text-white/50 font-medium uppercase tracking-wider text-xs">Calling...</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={leaveCall}
                                    variant="danger"
                                    className="w-16 h-16 rounded-full shadow-2xl shadow-red-500/40 hover:scale-110 transition-transform duration-300"
                                >
                                    <PhoneOff className="w-8 h-8" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Active Call Modal */}
                        {callAccepted && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="pointer-events-auto fixed inset-0 bg-[#000] flex flex-col items-center justify-center p-4 md:p-8"
                            >
                                <div className="relative w-full h-full max-w-6xl aspect-video md:aspect-auto bg-[#0a0a0a] rounded-[32px] md:rounded-[48px] overflow-hidden border border-white/5 shadow-2xl">
                                    {/* Main Video (Other User) */}
                                    <div className="absolute inset-0">
                                        {otherUserStream ? (
                                            <video
                                                ref={(el) => { if (el) el.srcObject = otherUserStream; }}
                                                autoPlay
                                                playsInline
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#000]">
                                                <Avatar className="w-32 h-32 border-4 border-white/5">
                                                    <img src={incomingCall?.avatar || outgoingCall?.userAvatar || "/default-avatar.png"} alt="User" />
                                                </Avatar>
                                                <p className="mt-8 text-white/40 font-medium animate-pulse">Waiting for video...</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Local Video Overlay */}
                                    {stream && (
                                        <motion.div
                                            drag
                                            dragConstraints={{ left: -500, right: 500, top: -300, bottom: 300 }}
                                            className="absolute bottom-10 right-10 w-44 md:w-64 aspect-[3/4] bg-[#000] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl z-10 cursor-move group"
                                        >
                                            <video
                                                ref={(el) => { if (el) el.srcObject = stream; }}
                                                autoPlay
                                                playsInline
                                                muted
                                                className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                                            />
                                            {isVideoOff && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                                                    <VideoOff className="w-8 h-8 text-white/20" />
                                                </div>
                                            )}
                                            <div className="absolute top-4 left-4 p-1.5 bg-black/40 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">You</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Top Info Bar */}
                                    <div className="absolute top-10 left-10 right-10 flex items-center justify-between z-10">
                                        <div className="px-6 py-3 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <p className="text-white font-bold tracking-tight text-sm uppercase">Live Call</p>
                                        </div>
                                        <div className="text-white/60 font-medium text-sm px-6 py-3 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/5">
                                            {incomingCall?.name || outgoingCall?.userName}
                                        </div>
                                    </div>

                                    {/* Bottom Controls */}
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 p-6 bg-white/5 backdrop-blur-3xl rounded-[32px] border border-white/10 z-10">
                                        <Button
                                            variant="ghost"
                                            onClick={muteMicrophone}
                                            className={`w-16 h-16 rounded-full transition-all duration-300 ${isMuted ? "bg-red-500/80 hover:bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                                        >
                                            {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                                        </Button>

                                        <Button
                                            onClick={leaveCall}
                                            variant="danger"
                                            className="w-20 h-20 rounded-full shadow-2xl shadow-red-500/40 hover:scale-110 active:scale-95 transition-all duration-300 mx-4"
                                        >
                                            <PhoneOff className="w-10 h-10" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={toggleVideo}
                                            className={`w-16 h-16 rounded-full transition-all duration-300 ${isVideoOff ? "bg-red-500/80 hover:bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                                        >
                                            {isVideoOff ? <VideoOff className="w-8 h-8" /> : <Video className="w-8 h-8" />}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </CallContext.Provider>
    );
};
