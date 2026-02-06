"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameLogic, GameMode } from "@/hooks/useGameLogic";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils";
import { Play, Loader2, ToggleLeft, ToggleRight, Delete } from "lucide-react";

interface PracticeModeProps {
    isRunning: boolean;
    studentId: string;
    setIsRunning: (isRunning: boolean) => void;
}

export function PracticeMode({ isRunning, studentId, setIsRunning }: PracticeModeProps) {
    const [mode, setMode] = useState<GameMode>("multiplication");
    const { currentQuestion, userInput, setInput, gameState, streak, selectedGroups, toggleGroup, stats, isWrong } = useGameLogic(isRunning, mode);
    const { playCorrect, playHover, initAudio, playIncorrect } = useSoundEffects();
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
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRunning, sessionComplete]);

    // Trigger completion when time hits 0
    useEffect(() => {
        if (timeLeft === 0 && !sessionComplete && isRunning) {
            handleSessionComplete();
        }
    }, [timeLeft, sessionComplete, isRunning]);

    const handleSessionComplete = async () => {
        setSessionComplete(true);
        setIsRunning(false); // Stop running
        // Log the session using the stats from useGameLogic
        const finalScore = stats.correct; // accessing stats from hook
        const totalAttempts = stats.total;
        const wrong = stats.wrongAttempts;

        try {
            const { logSessionAction, checkDailyStats } = await import("../app/actions");
            await logSessionAction(
                studentId,
                finalScore,
                totalAttempts,
                mode,
                wrong,
                isMultipleChoice,
                selectedGroups as string[]
            );

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

    // Error feedback
    useEffect(() => {
        if (isWrong) playIncorrect();
    }, [isWrong, playIncorrect]);
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
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
                    >
                        Menu
                    </button>
                    <button
                        onClick={() => {
                            setSessionComplete(false);
                            setTimeLeft(SESSION_DURATION);
                            setIsRunning(true);
                        }}
                        className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        );
    }

    if (!currentQuestion || !isRunning) {
        // Show Start Button if not running (and allowed)
        if (!isRunning) {
            return (
                <div className="flex flex-col min-h-[50vh] w-full max-w-md items-center justify-center space-y-4 rounded-3xl border border-white/5 bg-white/5 p-8 shadow-2xl backdrop-blur-3xl">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground uppercase tracking-widest">
                            Daily Goal: <span className="text-white font-bold">{dailySessions.count} / 5</span>
                        </div>
                    </div>

                    {/* Input Mode Toggle */}
                    <div className="flex flex-col items-center gap-2 w-full max-w-xs cursor-pointer hover:opacity-80 transition-opacity p-4 rounded-xl bg-white/5 border border-white/5" onClick={() => setIsMultipleChoice(!isMultipleChoice)}>
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                            Input Method
                        </span>
                        <div className="flex items-center gap-2 text-white">
                            {isMultipleChoice ? <ToggleRight className="w-6 h-6 text-indigo-400" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                            <span className="text-sm font-bold">{isMultipleChoice ? "Multiple Choice" : "Typing"}</span>
                        </div>
                    </div>

                    {/* Game Mode Toggle */}
                    <div className="flex w-full max-w-xs bg-black/40 p-1 rounded-xl">
                        {(["multiplication", "division"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                                    mode === m ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* Factor Group Selection */}
                    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                            Factor Focus
                        </span>
                        <div className="flex flex-wrap justify-center gap-2 w-full">
                            {(["2-4", "5-7", "8-9"] as const).map(group => (
                                <button
                                    key={group}
                                    onClick={() => toggleGroup(group)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-bold transition-all border flex-1 min-w-[30%]",
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

                    <button
                        onClick={() => setIsRunning(true)}
                        className="group relative flex items-center justify-center w-24 h-24 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] hover:scale-105 transition-all duration-300"
                    >
                        <Play className="w-10 h-10 ml-1 fill-current" />
                        <span className="absolute -bottom-6 text-xs font-bold uppercase tracking-widest text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">Start</span>
                    </button>

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
        <div className="relative flex min-h-[50vh] w-full max-w-md sm:max-w-2xl flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-3xl mx-4 sm:mx-0 mb-8">

            {/* Timer and Daily Count */}
            <div className="absolute top-4 left-0 right-0 flex justify-center items-center gap-4">
                <div className={cn(
                    "px-4 py-1.5 rounded-full border text-sm font-mono font-bold transition-all",
                    timeLeft <= 10 ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse" : "bg-white/5 border-white/10 text-white"
                )}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
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

            {/* Question Display */}
            <div className="mb-8 flex flex-col items-center space-y-2">
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
                            <span className="mx-4 sm:mx-6 text-muted-foreground">{currentQuestion.operator}</span>
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
                                        animate={isWrong ? { x: [0, -10, 10, -10, 10, 0], backgroundColor: "rgba(239, 68, 68, 0.2)", borderColor: "rgba(239, 68, 68, 0.5)" } : { opacity: 1, scale: 1, backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleOptionClick(opt)}
                                        onMouseEnter={() => playHover()}
                                        className={cn(
                                            "h-16 rounded-xl border text-2xl font-bold text-white transition-colors hover:border-indigo-500/50",
                                            isWrong ? "border-red-500/50 text-red-200" : "border-white/10 bg-white/5"
                                        )}
                                    >
                                        {opt}
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 w-full">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={userInput}
                                    readOnly
                                    className={cn(
                                        "w-full max-w-[200px] border-b-4 bg-transparent text-center text-6xl font-bold outline-none placeholder:text-white/10 focus:border-indigo-500 transition-all caret-transparent cursor-default",
                                        isWrong ? "border-red-500 text-red-500 animate-pulse" : "border-white/20 text-white"
                                    )}
                                    placeholder="?"
                                />

                                <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <motion.button
                                            key={num}
                                            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setInput(userInput + num)}
                                            className="h-14 rounded-full bg-white/10 border border-white/5 text-xl font-bold text-white flex items-center justify-center transition-colors"
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
                                        className="h-14 rounded-full bg-white/10 border border-white/5 text-xl font-bold text-white flex items-center justify-center transition-colors"
                                    >
                                        0
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,50,50,0.2)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setInput(userInput.slice(0, -1))}
                                        className="h-14 rounded-full bg-white/5 border border-white/5 text-white flex items-center justify-center transition-colors hover:bg-red-500/20 group"
                                    >
                                        <Delete className="w-5 h-5 text-muted-foreground group-hover:text-red-400" />
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
            <div className="mt-8 text-center h-6 w-full pointer-events-none">
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
