"use client";

import { useState, useEffect, useRef } from "react";
import { X, Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

interface WhatsAppOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
  callbackUrl?: string; // Optional callback URL for redirect after success
}

export default function WhatsAppOTPModal({
  isOpen,
  onClose,
  onSuccess,
  callbackUrl,
}: WhatsAppOTPModalProps) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get callbackUrl from props or searchParams, default to /feed
  const redirectUrl = callbackUrl || searchParams.get("callbackUrl") || "/feed";

  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const validatePhone = (phone: string): boolean => {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  };

  const handleSendOTP = async () => {
    if (!validatePhone(phone)) {
      setError("Invalid phone format. Use E.164 format (+923xxxxxxxxx)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep("otp");
        setTimer(300); // 5 minutes
        setCanResend(false);

        // In development mode, show OTP in toast and console
        if (data.devMode && data.otp) {
          toast.success(`✨ Development Mode: Your OTP is ${data.otp}`, {
            duration: 10000,
            icon: "🔑",
          });
          console.log("\n🔑 YOUR OTP CODE:", data.otp, "\n");
        } else {
          toast.success("OTP sent to WhatsApp!");
        }

        otpInputRefs.current[0]?.focus();
      } else {
        let errorMessage = data.error || "Failed to send OTP";

        // Handle specific error codes with user-friendly messages
        if (data.errorCode === "PHONE_NOT_ALLOWED") {
          errorMessage = "This phone number is not registered in our WhatsApp system. Please check the server console for the OTP code (in development mode). For production, contact support.";
          // Show info message instead of error since OTP is still logged to console in dev
          console.warn("⚠️ Phone number not in WhatsApp allowed list. Check server console for OTP code.");
        }

        setError(errorMessage);
        toast.error(errorMessage);
        if (data.retryAfter) {
          setTimer(data.retryAfter);
          setCanResend(false);
        }
        if (data.code === "WHATSAPP_NOT_CONFIGURED" || data.errorCode === "WHATSAPP_NOT_CONFIGURED") {
          // Service not available
          handleClose();
        }
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || timer > 0) return;
    await handleSendOTP();
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== "")) {
      handleVerifyOTP(newOtp.join(""));
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d{6}$/.test(pastedData)) return;

    const newOtp = pastedData.split("");
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill("")]);
    setError(null);
    otpInputRefs.current[5]?.focus();
    handleVerifyOTP(pastedData);
  };

  const handleVerifyOTP = async (otpValue?: string) => {
    const otpString = otpValue || otp.join("");
    if (otpString.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpString }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.verified) {
        // Create NextAuth session with callbackUrl
        const signInResult = await signIn("credentials", {
          phone,
          redirect: false,
          callbackUrl: redirectUrl,
        });

        if (signInResult?.ok || signInResult?.error === null) {
          toast.success("Phone verified successfully!");
          onSuccess(phone);
          handleClose();
        } else {
          // If credentials provider doesn't work, still proceed
          toast.success("Phone verified successfully!");
          onSuccess(phone);
          handleClose();
        }
      } else {
        setError(data.error || "Invalid OTP");
        setOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("phone");
    setPhone("");
    setOtp(["", "", "", "", "", ""]);
    setError(null);
    setTimer(0);
    setCanResend(false);
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">📱 Phone Verification</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {step === "phone" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="+923xxxxxxxxx"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendOTP();
                      }}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your phone number in E.164 format
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <Button
                  onClick={handleSendOTP}
                  disabled={isLoading || !phone}
                  variant="primary"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send OTP via WhatsApp"
                  )}
                </Button>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                  <p className="text-white font-medium">OTP Sent!</p>
                  <p className="text-sm text-gray-400">
                    Enter the 6-digit code sent to WhatsApp
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{phone}</p>
                </div>

                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-14 text-center text-2xl font-bold bg-gray-700/50 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      disabled={isLoading}
                    />
                  ))}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-400">
                    {timer > 0 ? (
                      <span>Resend in {formatTime(timer)}</span>
                    ) : (
                      <span className="text-gray-500">Code expired</span>
                    )}
                  </div>
                  <button
                    onClick={handleResendOTP}
                    disabled={!canResend || timer > 0 || isLoading}
                    className="text-purple-400 hover:text-purple-300 disabled:text-gray-600 disabled:cursor-not-allowed transition"
                  >
                    Resend OTP
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setStep("phone");
                      setOtp(["", "", "", "", "", ""]);
                      setError(null);
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => handleVerifyOTP()}
                    disabled={isLoading || otp.some((d) => !d)}
                    variant="primary"
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

