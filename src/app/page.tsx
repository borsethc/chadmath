"use client";

import { useState } from "react";
import Image from "next/image";
import { StudentDashboard } from "@/components/StudentDashboard";
import { cn } from "@/lib/utils";
import { loginAction } from "./actions";

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  // Import dynamically manually or just use fetch/server action
  // We need to import the action. Since this is a client component, we can import server actions.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setIsLoading(true);
    try {
      const timeoutPromise = new Promise<{ success: boolean, message?: string }>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out. Please try again.")), 10000)
      );

      const result = await Promise.race([
        loginAction(studentId),
        timeoutPromise
      ]);

      if (result.success) {
        setIsLoggedIn(true);
      } else {
        alert("Login failed: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error instanceof Error ? error.message : "System error. Check console / network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={cn(
      "flex flex-col items-center p-4 bg-background text-foreground transition-colors duration-500",
      isRunning ? "fixed inset-0 justify-center overflow-hidden touch-none" : "min-h-screen justify-start overflow-x-hidden relative py-8 sm:py-16"
    )}>
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className={cn("z-10 w-full flex flex-col items-center", isRunning ? "h-full justify-center" : "justify-start")}>
        {/* Header - Shrink or Hide on Mobile when Running */}
        <header className={cn(
          "text-center flex flex-col items-center shrink-0 transition-all duration-500 ease-in-out",
          isRunning ? "absolute top-4 scale-75 opacity-50 hover:opacity-100 z-50 origin-top" : "mb-6 sm:mb-8 relative"
        )}>
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className={cn("font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 transition-all", isRunning ? "text-2xl" : "text-4xl sm:text-6xl")}>
              ChadMath
            </h1>
          </div>
          {!isRunning && (
            <p className="mt-2 text-[10px] sm:text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Less Thinking, More Neural Linking
            </p>
          )}
        </header>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col items-center gap-4 w-full max-w-xs p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl isolate transform-gpu">
            <div className="flex flex-col gap-2 w-full">
              <label htmlFor="studentId" className="text-xs font-medium uppercase tracking-widest text-muted-foreground text-center">
                Username
              </label>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all"
                placeholder="Enter Username"
              // autoFocus removed for better mobile stability
              />
              <p className="text-[10px] text-white/40 text-center leading-tight mt-1 px-2">
                New player? Invent a unique, easy-to-remember username to track your progress!
              </p>
              <p className="text-[10px] text-amber-500/70 text-center leading-tight mt-1 px-2 font-medium">
                Note: Avoid common names (like "John") to prevent mixing your stats with other players!
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading || !studentId.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 touch-manipulation"
            >
              {isLoading ? "Loading..." : "Start Playing"}
            </button>
          </form>
        ) : (
          <StudentDashboard isRunning={isRunning} setIsRunning={setIsRunning} studentId={studentId} />
        )}
      </div>

      <div className="absolute bottom-4 text-center w-full pointer-events-none">
        <p className="text-[10px] text-white/20 font-mono">v0.1.5 (Strict Grouping Fix)</p>
      </div>

    </main>
  );
}
