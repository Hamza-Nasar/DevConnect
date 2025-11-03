"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        // If already logged in, go to feed
        if (status === "authenticated") {
            router.replace("/feed");
        }
    }, [status, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-sm text-center">
                <h1 className="text-2xl font-bold mb-6">Sign in to DevConnect</h1>

                <button
                    onClick={() => signIn("google", { callbackUrl: "/feed" })}
                    className="w-full mb-2 bg-blue-500 hover:bg-blue-600 p-2 rounded"
                >
                    Continue with Google
                </button>

                <button
                    onClick={() => signIn("github", { callbackUrl: "/feed" })}
                    className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded"
                >
                    Continue with GitHub
                </button>
            </div>
        </div>
    );
}
