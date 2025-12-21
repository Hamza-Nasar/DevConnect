"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Home } from "lucide-react";
import { Suspense } from "react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const errorMessages: Record<string, string> = {
        Configuration: "There is a problem with the server configuration. Please contact support.",
        AccessDenied: "You do not have permission to sign in.",
        Verification: "The verification token has expired or has already been used.",
        OAuthSignin: "Failed to connect to Google. Please check your internet connection and try again.",
        OAuthCallback: "Authentication callback failed. Please try again.",
        OAuthCreateAccount: "Could not create your account. Please try again.",
        EmailCreateAccount: "Could not create email account.",
        Callback: "Authentication callback failed. Please try again.",
        OAuthAccountNotLinked: "To confirm your identity, sign in with the same account you used originally.",
        EmailSignin: "The e-mail could not be sent.",
        CredentialsSignin: "Invalid credentials provided.",
        SessionRequired: "Please sign in to access this page.",
    };

    const errorMessage = error ? errorMessages[error] || "An error occurred during authentication." : "An unknown error occurred.";

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="bg-gray-800/50 backdrop-blur-sm shadow-lg rounded-2xl p-8 w-full max-w-md text-center border border-gray-700">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
                <p className="text-gray-400 mb-6">{errorMessage}</p>
                
                <div className="space-y-3">
                    <Link
                        href="/login"
                        className="block w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
                    >
                        Try Again
                    </Link>
                    <Link
                        href="/"
                        className="block w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold flex items-center justify-center space-x-2"
                    >
                        <Home className="w-5 h-5" />
                        <span>Go Home</span>
                    </Link>
                </div>

                {error && (
                    <p className="mt-4 text-xs text-gray-500">
                        Error code: {error}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-white">Loading...</div>
            </div>
        }>
            <ErrorContent />
        </Suspense>
    );
}

