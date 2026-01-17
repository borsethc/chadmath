"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameLogic } from "@/hooks/useGameLogic";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils";
import { Play, Loader2, ToggleLeft, ToggleRight, Delete } from "lucide-react";

interface PracticeModeProps {
    isRunning: boolean;
    studentId: string;
    setIsRunning: (isRunning: boolean) => void;
}

export function PracticeMode({ isRunning, studentId, setIsRunning }: PracticeModeProps) {
    const { currentQuestion, userInput, setInput, gameState, streak, selectedGroups, toggleGroup, stats } = useGameLogic(isRunning);
    const { playCorrect, playHover, initAudio } = useSoundEffects();
    const inputRef = useRef<HTMLInputElement>(null);

    // Session settings
    const SESSION_DURATION = 60; // 60 seconds
    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
    const [dailySessions, setDailySessions] = useState({ count: 0, allowed: true });
    const [isCheckingLimit, setIsCheckingLimit] = useState(true);
    const [sessionComplete, setSessionComplete] = useState(false);

    // Check daily limit on mount
    useEffect(() => {
        const check = async () => {
            try {
                const { checkDailyStats } = await import("../app/actions");
                const stats = await checkDailyStats(studentId);
                setDailySessions(stats);
            } catch (e) {
                console.error("Failed to check daily stats", e);
            } finally {
                setIsCheckingLimit(false);
            }
        };
        check();
    }, [studentId]);

    // Timer Logic
    useEffect(() => {
        if (!isRunning || sessionComplete) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSessionComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRunning, sessionComplete]);

    const handleSessionComplete = async () => {
        setSessionComplete(true);
        setIsRunning(false); // Stop running
        // Log the session using the stats from useGameLogic
        const finalScore = stats.correct; // accessing stats from hook
        const totalAttempts = stats.total;

        try {
            const { logSessionAction, checkDailyStats } = await import("../app/actions");
            await logSessionAction(studentId, finalScore, totalAttempts, "practice");

            // Re-check stats to update count immediately
            const newStats = await checkDailyStats(studentId);
            setDailySessions(newStats);
        } catch (e) {
            console.error("Failed to log session", e);
        }
    };

    // Initialize audio on first click
    useEffect(() => {
        const handleInit = () => initAudio();
        window.addEventListener("click", handleInit, { once: true });
        return () => window.removeEventListener("click", handleInit);
    }, [initAudio]);
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);

    // Keep focus
    useEffect(() => {
        if (!isRunning || sessionComplete) return;
        if (!isMultipleChoice) {
            inputRef.current?.focus();
        }
        const handleBlur = () => {
            if (!isMultipleChoice && !sessionComplete) inputRef.current?.focus();
        };
        // Use a slight delay or check activeElement to improve UX, but simple is fine for now
        // actually clicking buttons (like mode toggle) might steal focus. 
        // Let's rely on autoFocus and effect dependency.
    }, [isMultipleChoice, isRunning, sessionComplete, gameState]);

    const handleOptionClick = (val: number) => {
        if (gameState !== "waiting" || sessionComplete) return;
        setInput(val.toString());
    };

    if (isCheckingLimit) {
        return (
            <div className="flex h-screen items-center justify-center text-muted-foreground">
                <Loader2 className="animate-spin mr-2" /> Checking usage...
            </div>
        );
    }

    if (!dailySessions.allowed && !isRunning) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center text-center p-8 space-y-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl">
                <div className="text-4xl">🛑</div>
                <h2 className="text-3xl font-bold text-white">Daily Limit Reached</h2>
                <p className="text-lg text-muted-foreground max-w-sm">
                    You have completed all {dailySessions.count} sessions for today. Great work! Come back tomorrow to keep your streak.
                </p>
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-400">{dailySessions.count} / 5</div>
                    <div className="text-xs uppercase tracking-widest text-emerald-500/80">Sessions Completed</div>
                </div>
            </div>
        );
    }

    if (sessionComplete) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center text-center p-8 space-y-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl">
                <div className="text-4xl">🎉</div>
                <h2 className="text-3xl font-bold text-white">Session Complete!</h2>
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-3xl font-bold text-white">{stats.correct}</div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Correct</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-3xl font-bold text-white">{stats.total}</div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Total</div>
                    </div>
                </div>
                <div className="mt-8 text-sm text-gray-400">
                    Sessions today: <span className="text-white font-bold">{dailySessions.count} / 5</span>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                >
                    Return to Menu
                </button>
            </div>
        );
    }

    if (!currentQuestion || !isRunning) {
        // Show Start Button if not running (and allowed)
        if (!isRunning) {
            return (
                <div className="flex flex-col min-h-[60vh] w-full max-w-md items-center justify-center space-y-8 rounded-3xl border border-white/5 bg-white/5 p-12 shadow-2xl backdrop-blur-3xl">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground uppercase tracking-widest">
                            Daily Sessions: <span className="text-white font-bold">{dailySessions.count} / 5</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsRunning(true)}
                        className="group relative flex items-center justify-center w-32 h-32 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] hover:scale-105 transition-all duration-300"
                    >
                        <Play className="w-12 h-12 ml-1 fill-current" />
                        <span className="absolute -bottom-8 text-sm font-bold uppercase tracking-widest text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">Start</span>
                    </button>

                    <div className="text-center text-muted-foreground/50 text-xs uppercase tracking-[0.2em]">
                        Press to Begin
                    </div>
                </div>
            );
        }

        return (
            <div className="flex h-screen items-center justify-center text-muted-foreground">
                <Loader2 className="animate-spin mr-2" /> Loading...
            </div>
        );
    }

    return (
        <div className="relative flex min-h-[60vh] w-full max-w-md sm:max-w-2xl flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 p-6 sm:p-12 shadow-2xl backdrop-blur-3xl mx-4 sm:mx-0 mb-32">

            {/* Timer and Daily Count */}
            <div className="absolute top-4 left-0 right-0 flex justify-center items-center gap-4">
                <div className={cn(
                    "px-4 py-1.5 rounded-full border text-sm font-mono font-bold transition-all",
                    timeLeft <= 10 ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse" : "bg-white/5 border-white/10 text-white"
                )}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                {/* 
                Removing redundant display here since it's on the start screen now? 
                Actually keeping it is nice context during play. 
                */}
            </div>

            {/* Streak Counter */}
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8 flex flex-col items-end">
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Streak
                </span>
                <span className={cn(
                    "text-xl sm:text-2xl font-bold transition-colors",
                    streak > 5 ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "text-white"
                )}>
                    {streak}
                </span>
            </div>

            {/* Mode Toggle */}
            <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex flex-col items-start cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsMultipleChoice(!isMultipleChoice)}>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                    Mode
                </span>
                <div className="flex items-center gap-2 text-white">
                    {isMultipleChoice ? <ToggleRight className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" /> : <ToggleLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />}
                    <span className="text-xs sm:text-sm font-bold">{isMultipleChoice ? "Choices" : "Type"}</span>
                </div>
            </div>

            {/* Factor Group Selection */}
            <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 flex flex-col gap-2">
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Factor Focus
                </span>
                <div className="flex gap-1 sm:gap-2">
                    {(["2-4", "5-7", "8-9"] as const).map(group => (
                        <button
                            key={group}
                            onClick={() => toggleGroup(group)}
                            className={cn(
                                "px-2 py-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-bold transition-all border",
                                selectedGroups.includes(group)
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"

                            )}
                        >
                            {group}
                        </button>
                    ))}
                </div>
            </div>

            {/* Question Display */}
            <div className="mb-16 flex flex-col items-center space-y-2">
                {isRunning && currentQuestion ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestion.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex items-center text-7xl sm:text-9xl font-light tracking-tighter text-white"
                        >
                            <span>{currentQuestion.factor1}</span>
                            <span className="mx-4 sm:mx-6 text-muted-foreground">×</span>
                            <span>{currentQuestion.factor2}</span>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="flex items-center justify-center h-32 text-xl text-muted-foreground tracking-widest uppercase animate-pulse">
                        {/* 
                         Previously "Press Start". 
                         Now invalid state if isRunning is true but no question? 
                         Handled by loading state above.
                        */}
                    </div>
                )}
            </div>

            {/* Answer Section */}
            <div className="relative w-full flex justify-center min-h-[128px]">
                {isRunning && currentQuestion && (
                    gameState === "waiting" ? (
                        isMultipleChoice ? (
                            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                {currentQuestion.options.map((opt) => (
                                    <motion.button
                                        key={opt}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleOptionClick(opt)}
                                        onMouseEnter={() => playHover()}
                                        className="h-20 rounded-xl border border-white/10 bg-white/5 text-3xl font-bold text-white transition-colors hover:border-indigo-500/50"
                                    >
                                        {opt}
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 w-full">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={userInput}
                                    readOnly
                                    className="w-full max-w-[200px] border-b-4 border-white/20 bg-transparent text-center text-6xl font-bold text-white outline-none placeholder:text-white/10 focus:border-indigo-500 transition-all caret-transparent cursor-default"
                                    placeholder="?"
                                />

                                <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <motion.button
                                            key={num}
                                            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setInput(userInput + num)}
                                            className="h-16 rounded-full bg-white/10 border border-white/5 text-2xl font-bold text-white flex items-center justify-center transition-colors"
                                        >
                                            {num}
                                        </motion.button>
                                    ))}

                                    {/* Bottom row: Empty, 0, Backspace */}
                                    <div />
                                    <motion.button
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setInput(userInput + "0")}
                                        className="h-16 rounded-full bg-white/10 border border-white/5 text-2xl font-bold text-white flex items-center justify-center transition-colors"
                                    >
                                        0
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,50,50,0.2)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setInput(userInput.slice(0, -1))}
                                        className="h-16 rounded-full bg-white/5 border border-white/5 text-white flex items-center justify-center transition-colors hover:bg-red-500/20 group"
                                    >
                                        <Delete className="w-6 h-6 text-muted-foreground group-hover:text-red-400" />
                                    </motion.button>
                                </div>
                            </div>
                        )
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                                "flex h-32 w-full max-w-[200px] items-center justify-center rounded-xl text-6xl font-bold",
                                gameState === "correct" ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)]" : "bg-rose-500/20 text-rose-400"
                            )}
                        >
                            {currentQuestion.answer}
                        </motion.div>
                    )
                )}
            </div>

            {/* Status Message (Centered) */}
            <div className="absolute bottom-20 text-center h-6 left-0 right-0 pointer-events-none">
                {gameState === "revealed" && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm font-medium uppercase tracking-widest text-rose-400"
                    >
                        Memorize this!
                    </motion.span>
                )}
                {gameState === "correct" && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm font-medium uppercase tracking-widest text-emerald-400"
                    >
                        Correct
                    </motion.span>
                )}
            </div>
        </div>
    );
}
