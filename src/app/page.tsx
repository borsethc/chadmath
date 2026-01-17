"use client";

import { useState } from "react";
import Image from "next/image";
import { PracticeMode } from "@/components/PracticeMode";
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
      const result = await loginAction(studentId);

      if (result.success) {
        setIsLoggedIn(true);
      } else {
        alert("Login failed: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("System error. Check console / network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-black to-red-950/20 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="z-10 w-full flex flex-col items-center">
        <header className="mb-8 text-center flex flex-col items-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-24 h-24">
              <Image
                src="/school-logo.jpg"
                alt="St. Paul Central High School Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 sm:text-6xl">
              ChadMath
            </h1>
          </div>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Less Thinking, More Neural Linking
          </p>
        </header>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col items-center gap-4 w-full max-w-xs p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl isolate transform-gpu">
            <div className="flex flex-col gap-2 w-full">
              <label htmlFor="studentId" className="text-xs font-medium uppercase tracking-widest text-muted-foreground text-center">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all"
                placeholder="Enter ID"
              // autoFocus removed for better mobile stability
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !studentId.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 touch-manipulation"
            >
              {isLoading ? "Loading..." : "Enter Class"}
            </button>
          </form>
        ) : (
          <PracticeMode isRunning={isRunning} setIsRunning={setIsRunning} studentId={studentId} />
        )}
      </div>
    </main>
  );
}
