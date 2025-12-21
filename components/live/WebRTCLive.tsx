"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Settings, Users, MessageCircle, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import getSocket from "@/lib/socket";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface WebRTCLiveProps {
  streamId?: string;
  isHost?: boolean;
  onEnd?: () => void;
}

export default function WebRTCLive({ streamId, isHost = false, onEnd }: WebRTCLiveProps) {
  const { data: session } = useSession();
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef(getSocket());

  // WebRTC Configuration
  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // Add TURN servers for production
      // { urls: "turn:your-turn-server.com", username: "user", credential: "pass" }
    ],
  };

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (isHost && streamId) {
      socket.emit("join_stream", { streamId, isHost: true });
    } else if (streamId) {
      socket.emit("join_stream", { streamId, isHost: false });
    }

    socket.on("viewer_count", (count: number) => {
      setViewers(count);
    });

    socket.on("stream_like", () => {
      setLikes((prev) => prev + 1);
    });

    socket.on("stream_comment", (comment: { user: string; message: string }) => {
      setComments((prev) => [...prev, `${comment.user}: ${comment.message}`]);
    });

    socket.on("offer", async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (!isHost) {
        await handleOffer(data.offer);
      }
    });

    socket.on("answer", async (data: { answer: RTCSessionDescriptionInit }) => {
      if (isHost) {
        await handleAnswer(data.answer);
      }
    });

    socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      socket.off("viewer_count");
      socket.off("stream_like");
      socket.off("stream_comment");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      if (streamId) {
        socket.emit("leave_stream", { streamId });
      }
    };
  }, [isHost, streamId]);

  const startLive = async () => {
    try {
      // Get user media (camera + microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            streamId,
            candidate: event.candidate,
          });
        }
      };

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Create and send offer (for host)
      if (isHost) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        socketRef.current?.emit("offer", {
          streamId,
          offer: peerConnectionRef.current.localDescription,
        });
      }

      setIsLive(true);
      toast.success("Live stream started!");
    } catch (error: any) {
      console.error("Error starting live stream:", error);
      toast.error(error.message || "Failed to start live stream");
    }
  };

  const stopLive = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsLive(false);
    toast.success("Live stream ended");
    onEnd?.();
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            streamId,
            candidate: event.candidate,
          });
        }
      };
    }

    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    socketRef.current?.emit("answer", {
      streamId,
      answer: peerConnectionRef.current.localDescription,
    });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleLike = () => {
    if (socketRef.current && streamId) {
      socketRef.current.emit("stream_like", { streamId });
      setLikes((prev) => prev + 1);
    }
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && socketRef.current && streamId) {
      socketRef.current.emit("stream_comment", {
        streamId,
        user: session?.user?.name || "Anonymous",
        message: newComment,
      });
      setNewComment("");
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Video Display */}
      <div className="relative w-full h-[600px] bg-black rounded-xl overflow-hidden">
        {isHost ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Live Badge */}
        {isLive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-4 left-4"
          >
            <Badge variant="danger" className="flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              LIVE
            </Badge>
          </motion.div>
        )}

        {/* Stats Overlay */}
        {isLive && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Card variant="default" className="p-3 bg-black/70 backdrop-blur-sm">
              <div className="flex items-center gap-4 text-white text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{viewers}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>{likes}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Controls Overlay */}
        {isHost && isLive && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            <Button
              variant={isMuted ? "danger" : "secondary"}
              size="icon"
              onClick={toggleMute}
              className="rounded-full"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant={isVideoOff ? "danger" : "secondary"}
              size="icon"
              onClick={toggleVideo}
              className="rounded-full"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button
              variant="danger"
              size="icon"
              onClick={stopLive}
              className="rounded-full"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Start Live Button */}
      {!isLive && isHost && (
        <div className="mt-4 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={startLive}
            className="px-8 py-6 text-lg"
          >
            <Video className="h-6 w-6 mr-2" />
            Go Live
          </Button>
          <p className="text-sm text-gray-400 mt-2">
            Allow camera and microphone access to start streaming
          </p>
        </div>
      )}

      {/* Viewer Controls */}
      {!isHost && isLive && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleLike}>
              <Heart className="h-5 w-5 mr-1" />
              Like
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="h-5 w-5 mr-1" />
              Share
            </Button>
          </div>

          {/* Comments Section */}
          <Card variant="default" className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Live Comments
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
              <AnimatePresence>
                {comments.map((comment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-gray-300"
                  >
                    {comment}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button type="submit" variant="primary" size="sm">
                Send
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}







