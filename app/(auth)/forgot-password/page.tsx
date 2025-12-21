"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, ArrowLeft, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "otp" | "reset">("input");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ""));
  };

  const handleSendOTP = async () => {
    if (method === "email" && !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (method === "phone" && !validatePhone(phone)) {
      setError("Please enter a valid phone number (e.g., +1234567890)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: method === "email" ? email : undefined,
          phone: method === "phone" ? phone : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep("otp");
        setOtpTimer(900); // 15 minutes
        toast.success(`Password reset code sent to your ${method}`);
      } else {
        setError(data.error || "Failed to send reset code");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to send reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        email: method === "email" ? email : "",
        phone: method === "phone" ? phone : "",
        otp,
      });

      const res = await fetch(`/api/auth/reset-password?${params.toString()}`, {
        method: "GET",
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setStep("reset");
        toast.success("Code verified! Now set your new password");
      } else {
        setError(data.error || "Invalid or expired code");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: method === "email" ? email : undefined,
          phone: method === "phone" ? phone : undefined,
          otp,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card variant="elevated" className="bg-card backdrop-blur-sm shadow-2xl rounded-2xl p-8 w-full max-w-md border-border">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-muted-foreground">Enter your email or phone to receive a reset code</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm flex items-center gap-2"
            >
              <X className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {step === "input" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMethod("email");
                  setError(null);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${method === "email"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
              >
                Email
              </button>
              <button
                onClick={() => {
                  setMethod("phone");
                  setError(null);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${method === "phone"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
              >
                Phone
              </button>
            </div>

            {method === "email" ? (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-secondary/50 border-input"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 bg-secondary/50 border-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Include country code</p>
              </div>
            )}

            <Button
              onClick={handleSendOTP}
              disabled={isLoading || (method === "email" ? !email : !phone)}
              variant="primary"
              className="w-full"
            >
              {isLoading ? "Sending..." : "Send Reset Code"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-foreground font-medium">Code Sent!</p>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to your {method}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Enter Code</label>
              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-widest bg-secondary/50 border-input"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setStep("input");
                  setOtp("");
                }}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                variant="primary"
                className="flex-1"
              >
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "reset" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-foreground font-medium">Set New Password</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-secondary/50 border-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-secondary/50 border-input"
              />
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={isLoading || !newPassword || !confirmPassword}
              variant="primary"
              className="w-full"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </motion.div>
        )}
      </Card>
    </div>
  );
}

