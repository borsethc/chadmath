"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application Error:", error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white p-4 text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>
            <p className="text-gray-400 mb-8 max-w-md break-words">
                {error.message || "An unexpected error occurred."}
            </p>
            <button
                onClick={reset}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
