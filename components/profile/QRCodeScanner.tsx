"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Flashlight, FlashlightOff, RotateCcw } from "lucide-react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeScanner({ isOpen, onClose }: QRCodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasPermission(false);
      setIsScanning(false);
      toast.error('Camera access denied or unavailable');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };

      if (capabilities.torch) {
        await track.applyConstraints({
          // @ts-expect-error - torch is a non-standard MediaTrack constraint (Image Capture API) not in DOM types
          advanced: [{ torch: !flashEnabled }],
        });
        setFlashEnabled(!flashEnabled);
      } else {
        toast.error('Flash not supported on this device');
      }
    } catch (error) {
      console.error('Error toggling flash:', error);
      toast.error('Failed to toggle flash');
    }
  };

  const switchCamera = () => {
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use jsQR to scan for QR codes
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      console.log('QR Code detected:', code.data);
      handleQRCodeDetected(code.data);
    }
  };

  const handleQRCodeDetected = (url: string) => {
    console.log('QR Code detected:', url);

    // Check if it's a DevConnect profile URL
    if (url.includes('/profile/')) {
      const username = url.split('/profile/')[1];
      if (username) {
        toast.success(`Found profile: ${username}`);
        router.push(`/profile/${username}`);
        onClose();
        return;
      }
    }

    // If it's not a profile URL, just show it
    toast.success('QR Code scanned!');
    window.open(url, '_blank');
    onClose();
  };

  // Auto-scan every second when scanning is active
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isScanning && hasPermission) {
      interval = setInterval(scanQRCode, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning, hasPermission]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full h-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Scanning Frame */}
              <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-purple-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-purple-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-purple-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-purple-400 rounded-br-lg"></div>

                {/* Scanning line */}
                <motion.div
                  animate={{ y: [0, 220, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400"
                />
              </div>

              {/* Scanning hint */}
              <div className="mt-4 text-center">
                <p className="text-white text-sm font-medium">Scan QR Code</p>
                <p className="text-gray-300 text-xs">Point camera at a profile QR code</p>
              </div>
            </div>
          </div>

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
            <h3 className="text-white text-lg font-semibold">Scan QR Code</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={switchCamera}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFlash}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                {flashEnabled ? (
                  <FlashlightOff className="h-5 w-5" />
                ) : (
                  <Flashlight className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Permission Error */}
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <Card className="p-6 max-w-sm mx-4 text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-white mb-2">Camera Access Required</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Please allow camera access to scan QR codes.
                </p>
                <Button onClick={startCamera} className="w-full">
                  Try Again
                </Button>
              </Card>
            </div>
          )}

          {/* Loading */}
          {hasPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white">Starting camera...</p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}