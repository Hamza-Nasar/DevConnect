"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    User,
    CheckCircle,
    X,
    ArrowRight,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

function RegisterContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [signupMethod, setSignupMethod] = useState<"google" | "email" | "phone">("google");
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<"input" | "otp">("input");

    // Email/Phone signup state
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);

    const errorParam = searchParams.get("error");

    useEffect(() => {
        if (errorParam) {
            if (errorParam === "OAuthSignin") {
                setError("Failed to connect to Google. Please check your internet connection and try again.");
            } else if (errorParam === "Callback") {
                setError("Authentication failed. This might be due to database issues. Please try again in a moment.");
            } else if (errorParam === "OAuthCallback") {
                setError("OAuth callback error. Please try again.");
            } else {
                setError(`Authentication error: ${errorParam}. Please try again.`);
            }
        }
    }, [errorParam]);

    useEffect(() => {
        if (status === "authenticated" && session) {
            router.push("/feed");
        }
    }, [status, session, router]);

    useEffect(() => {
        if (otpTimer > 0) {
            const timer = setInterval(() => {
                setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [otpTimer]);

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (status === "authenticated") {
        return null; // Will redirect via useEffect
    }

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validatePhone = (phone: string) => {
        return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ""));
    };

    const handleGoogleSignUp = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (errorParam) {
                router.replace("/register");
            }

            const result = await signIn("google", {
                callbackUrl: "/feed",
                redirect: true
            });

            if (result?.error) {
                setError(`Sign up failed: ${result.error}. Please try again.`);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("Sign up error:", err);
            setError("Failed to sign up. Please check your internet connection and try again.");
            setIsLoading(false);
        }
    };

    const handleEmailSignup = async () => {
        if (!validateEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (!name || !username) {
            setError("Name and username are required");
            return;
        }

        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name, username }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Account created! Please login.");
                router.push("/login");
            } else {
                setError(data.error || "Failed to create account");
            }
        } catch (error) {
            console.error("Signup error:", error);
            setError("Failed to create account. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneSignup = async () => {
        if (!validatePhone(phone)) {
            setError("Please enter a valid phone number (e.g., +1234567890)");
            return;
        }

        if (!name || !username) {
            setError("Name and username are required");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Send OTP first
            const otpRes = await fetch("/api/auth/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });

            const otpData = await otpRes.json();

            if (otpRes.ok) {
                setOtpSent(true);
                setStep("otp");
                setOtpTimer(300);
                toast.success("OTP sent to your phone");
            } else {
                setError(otpData.error || "Failed to send OTP");
            }
        } catch (error) {
            console.error("OTP error:", error);
            setError("Failed to send OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTPAndSignup = async () => {
        if (otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Verify OTP
            const verifyRes = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.verified) {
                // Create account
                const signupRes = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, name, username }),
                });

                const signupData = await signupRes.json();

                if (signupRes.ok) {
                    toast.success("Account created! Please login.");
                    router.push("/login");
                } else {
                    setError(signupData.error || "Failed to create account");
                }
            } else {
                setError(verifyData.error || "Invalid OTP");
            }
        } catch (error) {
            console.error("Signup error:", error);
            setError("Failed to create account. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card variant="elevated" className="bg-card backdrop-blur-sm shadow-2xl rounded-2xl p-8 w-full max-w-md border-border">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-75"></div>
                            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-lg">
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        DevConnect
                    </h1>
                    <p className="text-muted-foreground">Create your account</p>
                </div>

                {/* Error Message */}
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

                {/* Signup Method Selector */}
                {step === "input" && (
                    <div className="mb-6">
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            <button
                                onClick={() => {
                                    setSignupMethod("google");
                                    setError(null);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${signupMethod === "google"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    }`}
                            >
                                Google
                            </button>
                            <button
                                onClick={() => {
                                    setSignupMethod("email");
                                    setError(null);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${signupMethod === "email"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    }`}
                            >
                                Email
                            </button>
                            <button
                                onClick={() => {
                                    setSignupMethod("phone");
                                    setError(null);
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${signupMethod === "phone"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    }`}
                            >
                                Phone
                            </button>
                        </div>

                        {/* Google Signup */}
                        {signupMethod === "google" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Button
                                    onClick={handleGoogleSignUp}
                                    disabled={isLoading}
                                    variant="primary"
                                    className="w-full py-6 text-base font-semibold"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            Sign up with Google
                                        </>
                                    )}
                                </Button>
                            </motion.div>
                        )}

                        {/* Email Signup */}
                        {signupMethod === "email" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 bg-secondary/50 border-input"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Username</label>
                                    <Input
                                        type="text"
                                        placeholder="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                                        className="bg-secondary/50 border-input"
                                    />
                                </div>
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
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Create a password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 bg-secondary/50 border-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleEmailSignup}
                                    disabled={isLoading}
                                    variant="primary"
                                    className="w-full"
                                >
                                    {isLoading ? "Creating account..." : "Create Account"}
                                </Button>
                            </motion.div>
                        )}

                        {/* Phone Signup */}
                        {signupMethod === "phone" && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 bg-secondary/50 border-input"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Username</label>
                                    <Input
                                        type="text"
                                        placeholder="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                                        className="bg-secondary/50 border-input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Phone Number</label>
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
                                    <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +1 for US)</p>
                                </div>
                                <Button
                                    onClick={handlePhoneSignup}
                                    disabled={isLoading || !name || !username || !phone}
                                    variant="primary"
                                    className="w-full"
                                >
                                    {isLoading ? "Sending OTP..." : "Send OTP"}
                                </Button>
                            </motion.div>
                        )}
                    </div>
                )}

                {/* OTP Verification (for phone signup) */}
                {step === "otp" && signupMethod === "phone" && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <div className="text-center mb-4">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                            <p className="text-foreground font-medium">OTP Sent!</p>
                            <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to your phone</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Enter OTP</label>
                            <Input
                                type="text"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="text-center text-2xl tracking-widest bg-secondary/50 border-input"
                                maxLength={6}
                            />
                            {otpTimer > 0 && (
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Resend OTP in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    setStep("input");
                                    setOtp("");
                                    setOtpSent(false);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleVerifyOTPAndSignup}
                                disabled={isLoading || otp.length !== 6}
                                variant="primary"
                                className="flex-1"
                            >
                                {isLoading ? "Creating..." : "Verify & Create"}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                        Already have an account?{" "}
                        <a href="/login" className="text-primary hover:text-primary/80">
                            Sign in
                        </a>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        By signing up, you agree to our{" "}
                        <a href="#" className="text-primary hover:text-primary/80">Terms of Service</a>{" "}
                        and <a href="#" className="text-primary hover:text-primary/80">Privacy Policy</a>
                    </p>
                </div>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <RegisterContent />
        </Suspense>
    );
}
