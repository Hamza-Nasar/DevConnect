"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Phone, CheckCircle, X, ArrowLeft, Shield, Clock, Smartphone } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import getSocket from "@/lib/socket";

export default function VerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "phone" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (session?.user?.email) {
      setEmail(session.user.email);
      fetchVerificationStatus();
      setupRealtimeConnection();
    }
  }, [session, status, router]);

  const setupRealtimeConnection = () => {
    const socket = getSocket();
    if (socket) {
      setIsRealtimeConnected(true);

      socket.on("verification_status_updated", (data: any) => {
        if (data.userId === session?.user?.id) {
          if (data.type === "email") {
            setEmailVerified(data.verified);
            toast.success("Email verification status updated!");
          } else if (data.type === "phone") {
            setPhoneVerified(data.verified);
            toast.success("Phone verification status updated!");
          }
        }
      });

      socket.on("verification_code_sent", (data: any) => {
        if (data.userId === session?.user?.id) {
          if (data.type === "email") {
            setStep("email");
            setOtpTimer(1800);
            toast.success("Verification code sent to your email");
          } else if (data.type === "phone") {
            setStep("phone");
            setOtpTimer(900);
            toast.success("Verification code sent to your phone");
          }
        }
      });

      return () => {
        socket.off("verification_status_updated");
        socket.off("verification_code_sent");
      };
    }
  };

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [otpTimer]);

  const fetchVerificationStatus = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        // Check verification status from user data
        // This would need to be added to the settings API
      }
    } catch (error) {
      console.error("Error fetching verification status:", error);
    }
  };

  const handleSendEmailVerification = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setStep("email");
        setOtpTimer(1800); // 30 minutes
        toast.success("Verification code sent to your email");
      } else {
        toast.error(data.error || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setEmailVerified(true);
        setStep(null);
        toast.success("Email verified successfully!");
      } else {
        toast.error(data.error || "Invalid verification code");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to verify email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Please enter a valid phone number with country code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep("phone");
        setOtpTimer(900); // 15 minutes
        toast.success("Verification code sent to your phone");
      } else {
        toast.error(data.error || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setPhoneVerified(true);
        setStep(null);
        toast.success("Phone verified successfully!");
      } else {
        toast.error(data.error || "Invalid verification code");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to verify phone");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Link href="/settings" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 sm:mb-6 text-sm sm:text-base">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>

          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Verify Your Account</h1>
              <p className="text-sm text-muted-foreground mt-1">Secure your account with email and phone verification</p>
            </div>

            {/* Mobile Security Level */}
            <div className="sm:hidden flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Security Level:</span>
              <Badge variant={(emailVerified && phoneVerified) ? "success" : (emailVerified || phoneVerified) ? "warning" : "danger"} className="text-xs">
                {(emailVerified && phoneVerified) ? "High" : (emailVerified || phoneVerified) ? "Medium" : "Low"}
              </Badge>
            </div>

            {/* Desktop Security Level */}
            <div className="hidden sm:flex items-center justify-end gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Security Level:</span>
              <Badge variant={(emailVerified && phoneVerified) ? "success" : (emailVerified || phoneVerified) ? "warning" : "danger"}>
                {(emailVerified && phoneVerified) ? "High" : (emailVerified || phoneVerified) ? "Medium" : "Low"}
              </Badge>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Realtime Connection Status */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4"
            >
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  {isRealtimeConnected ? 'Realtime Connected' : 'Connecting...'}
                </span>
                <span className="text-green-600 dark:text-green-400 text-xs ml-auto">
                  Live verification updates enabled
                </span>
              </div>
            </motion.div>

            {/* Email Verification */}
            <Card variant="elevated" className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Email Verification</h3>
                    <p className="text-sm text-muted-foreground break-all">{email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {emailVerified ? (
                    <Badge variant="success" className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="flex items-center gap-1.5">
                      <X className="h-3 w-3" />
                      Not Verified
                    </Badge>
                  )}
                </div>
              </div>

              {step === "email" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Enter Verification Code
                    </label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`text-center text-2xl tracking-widest bg-secondary/50 border-input transition-colors ${
                        otp.length === 6 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                        otp.length > 0 ? 'border-blue-500' : ''
                      }`}
                      maxLength={6}
                    />
                    <div className="flex justify-center gap-1 mt-2">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i < otp.length ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    {otpTimer > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Code expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => {
                        setStep(null);
                        setOtp("");
                      }}
                      variant="outline"
                      className="flex-1 order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyEmail}
                      disabled={isLoading || otp.length !== 6}
                      variant="primary"
                      className="flex-1 order-1 sm:order-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <Button
                  onClick={handleSendEmailVerification}
                  disabled={isLoading || emailVerified}
                  variant={emailVerified ? "outline" : "primary"}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Sending Code...
                    </>
                  ) : emailVerified ? (
                    "Email Verified"
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              )}
            </Card>

            {/* Phone Verification */}
            <Card variant="elevated" className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Phone Verification</h3>
                    <p className="text-sm text-muted-foreground break-all">
                      {phone || "Add phone number to verify"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {phoneVerified ? (
                    <Badge variant="success" className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="flex items-center gap-1.5">
                      <X className="h-3 w-3" />
                      Not Verified
                    </Badge>
                  )}
                </div>
              </div>

              {step === "phone" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Enter Verification Code
                    </label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`text-center text-2xl tracking-widest bg-secondary/50 border-input transition-colors ${
                        otp.length === 6 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                        otp.length > 0 ? 'border-blue-500' : ''
                      }`}
                      maxLength={6}
                    />
                    <div className="flex justify-center gap-1 mt-2">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i < otp.length ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    {otpTimer > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Code expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => {
                        setStep(null);
                        setOtp("");
                      }}
                      variant="outline"
                      className="flex-1 order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyPhone}
                      disabled={isLoading || otp.length !== 6}
                      variant="primary"
                      className="flex-1 order-1 sm:order-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {!phone && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-secondary/50 border-input"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Include country code</p>
                    </div>
                  )}
                  <Button
                    onClick={handleSendPhoneVerification}
                    disabled={isLoading || phoneVerified || !phone}
                    variant={phoneVerified ? "outline" : "primary"}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Sending Code...
                      </>
                    ) : phoneVerified ? (
                      "Phone Verified"
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}



