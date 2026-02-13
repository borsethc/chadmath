"use client";

import { Inter } from "next/font/google"; // Use same font
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className={inter.className + " bg-black text-white"}>
                <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Critical Error</h2>
                    <p className="text-gray-400 mb-8">
                        {error.message || "Something went critically wrong."}
                    </p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </body>
        </html>
    );
}
