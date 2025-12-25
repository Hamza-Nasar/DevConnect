"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  X,
  Zap,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"google" | "email" | "guest">("google");
  const [showPassword, setShowPassword] = useState(false);

  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (errorParam) {
      if (errorParam === "OAuthSignin") {
        setError("Failed to connect to Google. Please check your internet connection and try again.");
      } else if (errorParam === "Callback") {
        setError("Authentication failed. This might be due to database issues. Please try again in a moment.");
      } else if (errorParam === "OAuthCallback") {
        setError("OAuth callback error. Please try logging in again.");
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
    if (lockTimer > 0) {
      const timer = setInterval(() => {
        setLockTimer((prev) => (prev > 0 ? prev - 1 : 0));
        if (lockTimer === 1) {
          setIsLocked(false);
          setLoginAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockTimer]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (errorParam) {
        router.replace("/login");
      }

      const result = await signIn("google", {
        callbackUrl: "/feed",
        redirect: true
      });

      if (result?.error) {
        setError(`Sign in failed: ${result.error}. Please try again.`);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError("Failed to sign in. Please check your internet connection and try again.");
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get or create guestDeviceId from localStorage for persistence on same device
      let deviceId = typeof window !== 'undefined' ? localStorage.getItem("guestDeviceId") : null;
      if (!deviceId && typeof window !== 'undefined') {
        deviceId = `dev_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem("guestDeviceId", deviceId);
      }

      const result = await signIn("credentials", {
        guest: "true",
        deviceId: deviceId || "",
        redirect: false,
        callbackUrl: "/feed"
      });

      if (result?.error) {
        setError("Failed to create guest account.");
      } else {
        toast.success("Welcome, Guest!");
        router.push("/feed");
      }
    } catch (error) {
      console.error("Guest login error:", error);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailPasswordLogin = async () => {
    if (isLocked) {
      toast.error(`Account locked. Please wait ${lockTimer} seconds.`);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: email,
        password: password,
        redirect: false,
        callbackUrl: "/feed"
      });

      if (result?.ok && !result.error) {
        toast.success("Login successful!");
        router.push("/feed");
      } else {
        setError("Invalid credentials. Please try again.");
        setLoginAttempts((prev) => prev + 1);
        if (loginAttempts >= 4) {
          setIsLocked(true);
          setLockTimer(300);
          setError("Too many failed attempts. Account locked for 5 minutes.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm shadow-2xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md border border-gray-700/50"
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-75"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-2 sm:p-3 rounded-lg">
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1.5 sm:mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            DevConnect
          </h1>
          <p className="text-sm sm:text-base text-gray-400">Sign in to continue</p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-xs sm:text-sm flex items-start gap-2"
            >
              <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lock Message */}
        {isLocked && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-xs sm:text-sm flex items-start gap-2">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="break-words">Account locked. Please wait {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, "0")} minutes.</span>
          </div>
        )}

        {/* Login Method Selector */}
        <div className="mb-4 sm:mb-6">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 sm:mb-6">
            <button
              onClick={() => {
                setLoginMethod("google");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${loginMethod === "google"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                }`}
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              onClick={() => {
                setLoginMethod("email");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${loginMethod === "email"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                }`}
            >
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Email</span>
            </button>
            <button
              onClick={() => {
                setLoginMethod("guest");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${loginMethod === "guest"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                }`}
            >
              <UserCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Guest</span>
            </button>
          </div>

          {/* Google Login */}
          {loginMethod === "google" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading || isLocked}
                variant="primary"
                className="w-full py-4 sm:py-6 text-sm sm:text-base font-semibold"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="truncate">Continue with Google</span>
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Email Login */}
          {loginMethod === "email" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 sm:space-y-4"
            >
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 sm:pl-10 text-sm sm:text-base bg-gray-700/50 border-gray-600 h-10 sm:h-11"
                    disabled={isLocked}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base bg-gray-700/50 border-gray-600 h-10 sm:h-11"
                    disabled={isLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
              </div>
              <Button
                onClick={handleEmailPasswordLogin}
                disabled={isLoading || isLocked}
                variant="primary"
                className="w-full text-sm sm:text-base"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </motion.div>
          )}

          {/* Guest Login */}
          {loginMethod === "guest" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 sm:space-y-4"
            >
              <div className="text-center mb-3 sm:mb-4">
                <div className="bg-gray-700/30 p-3 sm:p-4 rounded-full inline-block mb-2 sm:mb-3">
                  <UserCircle className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5 sm:mb-2">
                  Guest Access
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 p-2 break-words">
                  Continue as a guest to explore the community. Some features may be limited compared to full accounts.
                </p>
              </div>
              <Button
                onClick={handleGuestLogin}
                variant="primary"
                className="w-full py-4 sm:py-6 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={isLoading}
              >
                Continue as Guest
              </Button>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 text-center space-y-1.5 sm:space-y-2">
          <p className="text-[10px] sm:text-xs text-gray-500 break-words">
            Don't have an account?{" "}
            <a href="/register" className="text-purple-400 hover:text-purple-300">
              Sign up
            </a>
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">
            <a href="/forgot-password" className="text-purple-400 hover:text-purple-300">
              Forgot password?
            </a>
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 break-words px-2">
            By signing in, you agree to our{" "}
            <a href="#" className="text-purple-400 hover:text-purple-300">Terms of Service</a>{" "}
            and <a href="#" className="text-purple-400 hover:text-purple-300">Privacy Policy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
