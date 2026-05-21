"use client";

import { useState, useEffect } from "react";
import { checkConnectionAction } from "@/app/actions";
import Link from "next/link";

export default function HealthPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [health, setHealth] = useState<{
        status: "connected" | "error" | "n/a";
        mode: "postgres" | "filesystem";
        message?: string;
    } | null>(null);

    const fetchHealth = async () => {
        setIsLoading(true);
        try {
            const res = await checkConnectionAction();
            setHealth(res);
        } catch (e) {
            setHealth({
                status: "error",
                mode: "filesystem",
                message: e instanceof Error ? e.message : "Failed to fetch diagnostics"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
    }, []);

    const isConnected = health?.status === "connected";
    const isFilesystem = health?.mode === "filesystem";

    let statusColor = "text-red-400 bg-red-500/10 border-red-500/30";
    let statusDot = "bg-red-500 shadow-[0_0_10px_#ef4444]";
    let statusText = "Connection Error";

    if (isLoading) {
        statusColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/30 animate-pulse";
        statusDot = "bg-indigo-500 shadow-[0_0_10px_#6366f1] animate-ping";
        statusText = "Checking...";
    } else if (isConnected) {
        statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
        statusDot = "bg-emerald-500 shadow-[0_0_10px_#10b981]";
        statusText = "Connected";
    } else if (isFilesystem) {
        statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
        statusDot = "bg-amber-500 shadow-[0_0_10px_#f59e0b]";
        statusText = "Filesystem Fallback";
    }

    return (
        <main className="min-h-screen bg-black text-white p-6 sm:p-12 font-sans relative overflow-hidden flex flex-col justify-between">
            {/* Background ambiance */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

            <div className="z-10 max-w-2xl w-full mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            System Diagnostics
                        </h1>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">
                            ChadMath Database & Server Health
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchHealth}
                            disabled={isLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? "Refreshing..." : "Refresh"}
                        </button>
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Dashboard
                        </Link>
                    </div>
                </header>

                {/* Status Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Database Health Card */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 sm:p-6">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                <span className={`h-2 w-2 rounded-full ${statusDot}`} />
                                {statusText}
                            </span>
                        </div>

                        <h2 className="text-lg font-bold text-gray-300 mb-4">Database Service</h2>

                        <div className="space-y-4 text-sm font-mono mt-6">
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">Operation Mode:</span>
                                <span className={`font-bold ${isLoading ? "text-gray-500 animate-pulse" : isFilesystem ? "text-amber-400" : "text-indigo-400"}`}>
                                    {isLoading ? "..." : (health?.mode || "unknown").toUpperCase()}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">Status Check:</span>
                                <span className={isLoading ? "text-gray-500 animate-pulse" : isConnected ? "text-emerald-400 font-bold" : isFilesystem ? "text-amber-400 font-bold" : "text-red-400 font-bold"}>
                                    {isLoading ? "..." : (health?.status || "unknown").toUpperCase()}
                                </span>
                            </div>

                            {!isLoading && health?.message && (
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg mt-4">
                                    <div className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">Details:</div>
                                    <div className="text-xs text-gray-300 break-words">{health.message}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Environment Variables Card */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-2xl">
                        <h2 className="text-lg font-bold text-gray-300 mb-4">Environment Config</h2>

                        <div className="space-y-4 text-sm font-mono">
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">DATABASE_URL:</span>
                                <span>
                                    {isLoading ? (
                                        <span className="text-gray-500 animate-pulse">...</span>
                                    ) : health?.mode === "postgres" ? (
                                        "✅ CONFIGURED"
                                    ) : (
                                        "❌ NOT CONFIGURED (Using local/device storage)"
                                    )}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">Runtime Target:</span>
                                <span className="text-gray-300">
                                    {health?.mode === "filesystem" && health?.message?.includes("Local storage mode")
                                        ? "App Store Build (Offline)"
                                        : "Railway Build (Server)"}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">App Version:</span>
                                <span className="text-gray-300">1.1.0 (Hybrid Server)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="z-10 text-center text-[10px] text-gray-600 font-mono mt-12">
                Diagnostics Ping: {new Date().toISOString()}
            </footer>
        </main>
    );
}
