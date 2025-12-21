"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Phone, CheckCircle, X, ArrowLeft } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (session?.user?.email) {
      setEmail(session.user.email);
      fetchVerificationStatus();
    }
  }, [session, status, router]);

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/settings" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-8">Verify Your Account</h1>

          <div className="space-y-6">
            {/* Email Verification */}
            <Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Email Verification</h3>
                    <p className="text-sm text-muted-foreground">{email}</p>
                  </div>
                </div>
                {emailVerified ? (
                  <Badge variant="success" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning">Not Verified</Badge>
                )}
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
                      className="text-center text-2xl tracking-widest bg-secondary/50 border-input"
                      maxLength={6}
                    />
                    {otpTimer > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Code expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setStep(null);
                        setOtp("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyEmail}
                      disabled={isLoading || otp.length !== 6}
                      variant="primary"
                      className="flex-1"
                    >
                      {isLoading ? "Verifying..." : "Verify"}
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
                  {emailVerified ? "Email Verified" : "Send Verification Code"}
                </Button>
              )}
            </Card>

            {/* Phone Verification */}
            <Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Phone Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      {phone || "Add phone number to verify"}
                    </p>
                  </div>
                </div>
                {phoneVerified ? (
                  <Badge variant="success" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning">Not Verified</Badge>
                )}
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
                      className="text-center text-2xl tracking-widest bg-secondary/50 border-input"
                      maxLength={6}
                    />
                    {otpTimer > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Code expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setStep(null);
                        setOtp("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyPhone}
                      disabled={isLoading || otp.length !== 6}
                      variant="primary"
                      className="flex-1"
                    >
                      {isLoading ? "Verifying..." : "Verify"}
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
                    {phoneVerified ? "Phone Verified" : "Send Verification Code"}
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



