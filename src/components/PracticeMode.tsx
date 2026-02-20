"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameInstructions } from "./GameInstructions";
import { useGameLogic, GameMode } from "@/hooks/useGameLogic";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils";
import { Play, Loader2, ToggleLeft, ToggleRight, Delete } from "lucide-react";


import { Confetti } from "./Confetti";
import { getFeedback } from "@/lib/assessment";

interface PracticeModeProps {
    isRunning: boolean;
    studentId: string;
    setIsRunning: (isRunning: boolean) => void;
}

export function PracticeMode({ isRunning, studentId, setIsRunning }: PracticeModeProps) {
    const [mode, setMode] = useState<GameMode>("multiplication");
    const [isTimerEnabled, setIsTimerEnabled] = useState(true);
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);

    // We lift factMastery state up slightly to pass it down, but useGameLogic manages its internal copy
    // We need a ref to hold initial mastery because we don't want to reset logic on state update?
    // Actually useGameLogic handles internal state. We just pass initial.
    // The issue is `factMastery` state is loaded async.
    // We can key the useGameLogic on `factMastery` loaded? Or update useGameLogic to sync.
    // Logic updated to sync on prop change.

    // Move logic call below state definitions
    // But we need `factMastery` defined before `useGameLogic`... 
    // And `useGameLogic` returns `sessionMasteryUpdates`.

    // We need to define stats etc later? No, hooks order.
    // Initialize empty, then update when loaded.

    // Define `factMastery` state here (initially empty).
    // See modification in next chunk. 

    // We need to move `useGameLogic` call AFTER `factMastery` state decl.
    // But `factMastery` is in the same scope. 
    // Typescript hoisting works? No, `const`.
    // We'll move `useGameLogic` down.

    // WAIT, I can't move hooks easily with find/replace if they are interspersed.
    // I will replace the whole top block.

    // Let's modify the props of useGameLogic first.
    // I will do this in stages. this chunk replaces the top.

    // ... ignoring implementation details, I will use next chunks.

    const { playCorrect, playHover, initAudio, playIncorrect } = useSoundEffects();
    const inputRef = useRef<HTMLInputElement>(null);

    // Session settings
    const SESSION_DURATION = 60; // 60 seconds
    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
    const [dailySessions, setDailySessions] = useState({ count: 0, allowed: true });
    const [allTimeHigh, setAllTimeHigh] = useState<number | undefined>(undefined);
    const [isCheckingLimit, setIsCheckingLimit] = useState(true);
    const [sessionComplete, setSessionComplete] = useState(false);

    // Gamification State
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [earnedXp, setEarnedXp] = useState(0); // For session summary
    const [showConfetti, setShowConfetti] = useState(false);
    const [comboScale, setComboScale] = useState(1);
    const [shake, setShake] = useState(0); // Shake intensity
    const [dailyStreak, setDailyStreak] = useState(0);
    const [streakUpdated, setStreakUpdated] = useState(false); // To show effect
    const [factMastery, setFactMastery] = useState<Record<string, number>>({});

    // Hooks - Must be called before effects that use them
    const { currentQuestion, userInput, setInput, gameState, streak, selectedGroups, toggleGroup, stats, isWrong, sessionMasteryUpdates, selectedTables, setSelectedTables } = useGameLogic(isRunning, mode, isTimerEnabled, isMultipleChoice, factMastery);

    // Check daily limit and all time high on mount
    useEffect(() => {
        const check = async () => {
            try {
                const { checkDailyStats, loginAction } = await import("../app/actions");

                // Add a timeout to prevent infinite loading
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Request timed out")), 10000)
                );

                const dataPromise = (async () => {
                    const stats = await checkDailyStats(studentId);
                    setDailySessions(stats);

                    const loginData = await loginAction(studentId);
                    if (loginData.success) {
                        setAllTimeHigh(loginData.allTimeHigh);
                        if (loginData.xp !== undefined) setXp(loginData.xp);
                        if (loginData.level !== undefined) setLevel(loginData.level);
                        if (loginData.dailyStreak !== undefined) setDailyStreak(loginData.dailyStreak);
                        if (loginData.factMastery !== undefined) setFactMastery(loginData.factMastery);
                    }
                })();

                await Promise.race([dataPromise, timeoutPromise]);
            } catch (e) {
                console.error("Failed to check stats", e);
            } finally {
                setIsCheckingLimit(false);
            }
        };
        check();
    }, [studentId]);

    // Timer Logic
    useEffect(() => {
        if (!isRunning || sessionComplete) return;

        // Reset timer if it's the start (or just ensure it's running correctly)
        // Actually, we should reset when isRunning BECOMES true.
        // But this effect runs on change.
        // We can't easily detect "start" here without a ref or separate effect.
        // Let's stick to the interval logic, BUT...
        // We need a separate effect to reset time on start.
    }, [isRunning, sessionComplete]);

    // Play sound when answer is wrong
    useEffect(() => {
        if (isWrong) playIncorrect();
    }, [isWrong, playIncorrect]);

    // Reset Timer on Start
    useEffect(() => {
        if (isRunning && !sessionComplete) {
            setTimeLeft(SESSION_DURATION);
        }
    }, [isRunning, sessionComplete]);

    useEffect(() => {
        if (!isRunning || sessionComplete || !isTimerEnabled) return;

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
    }, [isRunning, sessionComplete, isTimerEnabled]);


    // Trigger completion when time hits 0 or question limit reached in assessment
    useEffect(() => {
        if (!isRunning || sessionComplete) return;

        if (isTimerEnabled && timeLeft === 0) {
            handleSessionComplete();
        } else if (mode === "assessment" && stats.total >= 60) {
            handleSessionComplete();
        }
    }, [timeLeft, sessionComplete, isRunning, mode, stats.total, isTimerEnabled]);

    const handleSessionComplete = async () => {
        setSessionComplete(true);
        setIsRunning(false); // Stop running
        // Log the session using the stats from useGameLogic
        const finalScore = stats.correct; // accessing stats from hook
        const totalAttempts = stats.total;
        const wrong = stats.wrongAttempts;

        // Calculate assessment tier if mode is assessment
        const assessmentTier = mode === "assessment" ? getFeedback(finalScore).tier : undefined;

        try {
            const { logSessionAction, checkDailyStats } = await import("../app/actions");
            const result = await logSessionAction(
                studentId,
                finalScore,
                totalAttempts,
                mode,
                wrong,
                isMultipleChoice,
                selectedGroups as string[],
                assessmentTier,
                sessionMasteryUpdates // Pass the mastery updates
            );

            // Update local state if needed (e.g. merge updates back to factMastery so if they restart, they keep it)
            if (Object.keys(sessionMasteryUpdates).length > 0) {
                setFactMastery(prev => ({ ...prev, ...sessionMasteryUpdates }));
            }

            if (result.allTimeHigh !== undefined) {
                setAllTimeHigh(result.allTimeHigh);
            }

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
        if (isWrong) {
            playIncorrect();
        }
    }, [isWrong, playIncorrect]);

    // Combo / Correct Feedback
    useEffect(() => {
        if (gameState === "correct") {
            playCorrect(streak);

            // "Juice": Scale combo text and shake screen slightly on high combos
            // Reduced intensity significantly
            setComboScale(streak > 5 ? 1.2 : 1.1);
            setTimeout(() => setComboScale(1), 200);

            if (streak > 5) {
                setShake(2); // Reduced shake intensity (was 5)
                setTimeout(() => setShake(0), 200);
            }
        }
    }, [gameState, streak, playCorrect]);

    // Move isMultipleChoice state up
    // Removed duplicate declaration

    // ...
    // Since we moved isMultipleChoice, we need to remove the duplicate declaration line if it exists content-wise. 
    // In original code: `const [isMultipleChoice, setIsMultipleChoice] = useState(false);` was around line 280.
    // I need to find it and delete it.


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
    }, [isMultipleChoice, isRunning, sessionComplete, gameState, mode]);

    const handleOptionClick = (val: number | string) => {
        if (gameState !== "waiting" || sessionComplete || isWrong) return;
        setInput(val.toString());
    };

    // Loading State with Escape Hatch
    const [showSkipButton, setShowSkipButton] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isCheckingLimit) {
            timer = setTimeout(() => setShowSkipButton(true), 3000); // Show skip after 3s
        }
        return () => clearTimeout(timer);
    }, [isCheckingLimit]);

    if (isCheckingLimit) {
        return (
            <div className="flex flex-col h-screen items-center justify-center text-muted-foreground gap-4">
                <div className="flex items-center">
                    <Loader2 className="animate-spin mr-2" /> Checking usage...
                </div>
                {showSkipButton && (
                    <button
                        onClick={() => setIsCheckingLimit(false)}
                        className="text-xs text-red-400 hover:text-red-300 underline underline-offset-4"
                    >
                        Skip checks (Force Start)
                    </button>
                )}
            </div>
        );
    }






    if (sessionComplete) {
        const feedback = mode === "assessment" ? getFeedback(stats.correct) : null;

        return (
            <div className="flex flex-col h-[80vh] items-center justify-center text-center p-8 space-y-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl overflow-y-auto relative overflow-hidden">
                <div className="text-4xl">
                    🎉
                </div>
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

                {feedback && (
                    <div className="w-full max-w-md bg-white/5 rounded-xl border border-white/10 p-6 text-left space-y-4">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-indigo-400 mb-1">{feedback.range}</div>
                            <h3 className="text-xl font-bold text-white">{feedback.tier}</h3>
                        </div>
                        <div className="space-y-2 text-sm text-gray-300">
                            {feedback.description.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                        <div className="pt-2 border-t border-white/10">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Instructional Focus:</span>
                            <p className="text-sm text-white mt-1">{feedback.focus}</p>
                        </div>
                    </div>
                )}

                {/* Session History List */}
                {mode === "assessment" && stats.history && stats.history.length > 0 && (
                    <div className="w-full max-w-md bg-white/5 rounded-xl border border-white/10 p-4 mt-6 max-h-[60vh] overflow-y-auto">
                        <h4 className="text-white font-bold mb-3 border-b border-white/10 pb-2">Session History</h4>
                        <div className="space-y-2">
                            {stats.history.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-300 w-1/3">{item.question}</span>
                                    <span className={cn("w-1/3 text-center font-mono", item.isCorrect ? "text-emerald-400" : "text-red-400")}>
                                        {item.userAnswer}
                                    </span>
                                    <span className="w-1/3 text-right text-gray-500">
                                        {!item.isCorrect && (
                                            <span className="text-xs text-emerald-500/70">Ans: {item.answer}</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!feedback && (
                    <div className="mt-8 text-sm text-gray-400">
                        Sessions today: <span className="text-white font-bold">{dailySessions.count} / 5</span>
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setSessionComplete(false);
                            setIsRunning(false);
                        }}
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
                        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground uppercase tracking-widest flex gap-4">
                            <span>Goal: <span className="text-white font-bold">{dailySessions.count} / 5</span></span>
                        </div>
                    </div>

                    {/* Input Mode Toggle */}
                    <div className="flex gap-2 w-full max-w-xs">
                        <div className="flex flex-col items-center gap-2 flex-1 cursor-pointer hover:opacity-80 transition-opacity p-3 rounded-xl bg-white/5 border border-white/5" onClick={() => setIsMultipleChoice(!isMultipleChoice)}>
                            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                Input Method
                            </span>
                            <div className="flex items-center gap-2 text-white">
                                {isMultipleChoice ? <ToggleRight className="w-6 h-6 text-indigo-400" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                                <span className="text-xs font-bold">{isMultipleChoice ? "Choice" : "Type"}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 flex-1 cursor-pointer hover:opacity-80 transition-opacity p-3 rounded-xl bg-white/5 border border-white/5" onClick={() => setIsTimerEnabled(!isTimerEnabled)}>
                            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                Timer
                            </span>
                            <div className="flex items-center gap-2 text-white">
                                {isTimerEnabled ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                                <span className="text-xs font-bold">{isTimerEnabled ? "On" : "Off"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Top Level Mode Toggle */}
                    <div className="grid grid-cols-3 gap-1 w-full max-w-sm bg-black/40 p-1 rounded-xl mb-4">
                        <button
                            onClick={() => setMode("tables")}
                            className={cn(
                                "flex items-center justify-center py-2 px-2 rounded-lg text-xs font-bold transition-all",
                                mode === "tables" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                            )}
                        >
                            Tables
                        </button>
                        <button
                            onClick={() => {
                                if (mode !== "multiplication" && mode !== "division") setMode("multiplication");
                            }}
                            className={cn(
                                "flex items-center justify-center py-2 px-2 rounded-lg text-xs font-bold transition-all",
                                (mode === "multiplication" || mode === "division") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                            )}
                        >
                            Factor Focus
                        </button>
                        <button
                            onClick={() => setMode("assessment")}
                            className={cn(
                                "flex items-center justify-center py-2 px-2 rounded-lg text-xs font-bold transition-all",
                                mode === "assessment" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                            )}
                        >
                            Assessment
                        </button>
                    </div>

                    {/* Operator Toggle (Only for Practice Mode) */}
                    {(mode === "multiplication" || mode === "division") && (
                        <div className="flex flex-col items-center gap-2 w-full max-w-xs mb-4">
                            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                Operation
                            </span>
                            <div className="flex gap-2 w-full bg-black/20 p-1 rounded-xl">
                                <button
                                    onClick={() => setMode("multiplication")}
                                    className={cn(
                                        "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
                                        mode === "multiplication" ? "bg-white/10 text-white border border-white/20" : "text-gray-500 hover:text-gray-300"
                                    )}
                                >
                                    × Multiply
                                </button>
                                <button
                                    onClick={() => setMode("division")}
                                    className={cn(
                                        "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
                                        mode === "division" ? "bg-white/10 text-white border border-white/20" : "text-gray-500 hover:text-gray-300"
                                    )}
                                >
                                    ÷ Divide
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Factor Group Selection - Hide for Assessment AND Tables */}
                    {mode !== "assessment" && mode !== "tables" && (
                        <div className="flex flex-col items-center gap-3 w-full max-w-xs pt-2">
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
                    )}

                    {/* Table Selection - Only for Tables Mode */}
                    {mode === "tables" && (
                        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                            <div className="flex justify-between items-center w-full">
                                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    Select Tables
                                </span>
                                <button
                                    onClick={() => {
                                        if (selectedTables.length === 8) setSelectedTables([]);
                                        else setSelectedTables([2, 3, 4, 5, 6, 7, 8, 9]);
                                    }}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300"
                                >
                                    {selectedTables.length === 8 ? "Clear All" : "Select All"}
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 w-full">
                                {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => {
                                            // Toggle logic
                                            setSelectedTables(prev => {
                                                if (prev.includes(num)) {
                                                    // Don't allow empty, keep at least one
                                                    if (prev.length === 1) return prev;
                                                    return prev.filter(n => n !== num);
                                                } else {
                                                    return [...prev, num].sort((a, b) => a - b);
                                                }
                                            });
                                        }}
                                        className={cn(
                                            "aspect-square rounded-xl text-lg font-bold transition-all border flex items-center justify-center",
                                            selectedTables.includes(num)
                                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
                                        )}

                                    >
                                        ×{num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setIsRunning(true)}
                        className="group relative flex items-center justify-center w-24 h-24 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] hover:scale-105 transition-all duration-300"
                    >
                        <Play className="w-10 h-10 ml-1 fill-current" />
                        <span className="absolute -bottom-6 text-xs font-bold uppercase tracking-widest text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">Start</span>
                    </button>

                    <GameInstructions />

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
        <div
            className="relative flex min-h-[50vh] w-full max-w-md sm:max-w-2xl flex-col items-center rounded-3xl border border-white/5 bg-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-3xl mx-4 sm:mx-0 mb-8 overflow-hidden">

            {/* Top Center Controls (Timer) */}
            {isTimerEnabled && (
                <div className="w-full flex justify-center items-center gap-4 z-20 mb-4 sm:mb-8 min-h-[32px]">
                    <div className={cn(
                        "px-4 py-1.5 rounded-full border text-sm font-mono font-bold transition-all",
                        timeLeft <= 10 ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse" : "bg-white/5 border-white/10 text-white"
                    )}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 sm:top-8 sm:right-8 flex flex-col items-end z-20">
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Score
                </span>
                <span className={cn(
                    "text-xl sm:text-2xl font-bold transition-colors",
                    streak > 5 ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "text-white"
                )}>
                    {stats.correct}
                </span>
            </div>



            {/* All Time High Display (Assessment only) */}
            {mode === "assessment" && allTimeHigh !== undefined && (
                <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex flex-col items-start z-20">
                    <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        High Score
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                        {allTimeHigh}
                    </span>
                </div>
            )}

            {/* Daily Streak Display */}
            <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex flex-col items-start z-20">
                {mode !== "assessment" && (
                    <>
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-muted-foreground">
                            Day Streak
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-xl sm:text-2xl">🔥</span>
                            <span className={cn(
                                "text-xl sm:text-2xl font-bold transition-colors",
                                streakUpdated ? "text-orange-400 animate-pulse" : "text-white"
                            )}>
                                {dailyStreak}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Question Display - Only show if state is Correct */}
            {(
                <div className="mb-2 flex flex-col items-center space-y-2">
                    {isRunning && currentQuestion ? (
                        <div className="flex items-center text-7xl sm:text-9xl font-light tracking-tighter text-white">
                            <span>
                                {currentQuestion.factor1}
                            </span>
                            <span className="mx-4 sm:mx-6 text-muted-foreground">{currentQuestion.operator}</span>
                            <span>
                                {currentQuestion.factor2}
                            </span>
                        </div>
                    ) : null}
                </div>
            )}


            {/* Answer Section */}
            <div className="relative w-full flex justify-center min-h-[128px]">
                {isRunning && currentQuestion && (
                    gameState === "waiting" || gameState === "correct" ? (
                        isMultipleChoice ? (
                            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                {currentQuestion?.options.map((opt) => (
                                    <motion.button
                                        key={opt}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={isWrong && userInput === opt.toString() ? { x: [0, -10, 10, -10, 10, 0] } : { opacity: 1, scale: 1, x: 0 }}
                                        transition={{ duration: 0.4 }}
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleOptionClick(opt)}
                                        onMouseEnter={() => playHover()}
                                        className={cn(
                                            "h-16 rounded-xl border text-xl sm:text-2xl font-bold text-white transition-colors hover:border-indigo-500/50",
                                            /* Standard styling */
                                            "border-white/10 bg-white/5"
                                        )}
                                    >
                                        {opt}
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 w-full">
                                <motion.div
                                    key="input-container"
                                    animate={{}}
                                    transition={{ duration: 0.4 }}
                                    className="w-full max-w-[200px]"
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={userInput}
                                        readOnly
                                        className={cn(
                                            "w-full border-b-4 bg-transparent text-center text-6xl font-bold outline-none placeholder:text-white/20 focus:border-indigo-500 transition-all caret-transparent cursor-default",
                                            /* Standard styling */
                                            gameState === "correct"
                                                ? "!border-emerald-500 !text-emerald-400 scale-110 duration-300"
                                                : isWrong
                                                    ? "border-red-500 text-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                                    : "border-white/20 text-white"
                                        )}
                                        placeholder="?"
                                    />
                                </motion.div>

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

                                    {/* Bottom row: Juice/Flair, 0, Backspace */}
                                    <div className="flex items-center justify-center overflow-visible z-20">
                                        {streak > 1 && !isMultipleChoice && (
                                            <motion.div
                                                animate={{ scale: comboScale }}
                                                className={cn(
                                                    "font-black italic transition-colors text-center whitespace-nowrap",
                                                    streak > 5 ? "text-yellow-400 text-xs drop-shadow-[0_0_2px_rgba(250,204,21,0.5)]" : "text-emerald-400 text-[10px]"
                                                )}
                                            >
                                                {streak > 5 ? "ON FIRE!" : `${streak}x`}
                                            </motion.div>
                                        )}
                                    </div>
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
                                "flex h-32 w-full max-w-[200px] items-center justify-center rounded-xl text-6xl font-bold bg-rose-500/20 text-rose-400"
                            )}
                        >
                            {currentQuestion?.answer}
                        </motion.div>
                    )
                )}
            </div>

            {/* Visual Flair (Combo Text) - Showing here for Multiple Choice Mode ONLY */}
            {
                streak > 1 && isMultipleChoice && (
                    <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
                        <motion.div
                            animate={{ scale: comboScale }}
                            className={cn(
                                "font-black italic transition-colors text-right",
                                streak > 5 ? "text-yellow-400 text-xl drop-shadow-[0_0_5px_rgba(250,204,21,0.6)]" : "text-emerald-400 text-lg"
                            )}
                        >
                            {streak > 5 ? "ON FIRE!" : `${streak}x COMBO!`}
                        </motion.div>
                    </div>
                )
            }

            {/* End Session Controls (Manual Finish / Menu) - Moved to bottom to prevent overlap */}
            {!isTimerEnabled && (
                <div className="mt-8 flex justify-center gap-4 w-full z-20">
                    <button
                        onClick={() => setIsRunning(false)}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors"
                    >
                        Menu
                    </button>
                    <button
                        onClick={() => handleSessionComplete()}
                        className="px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors"
                    >
                        Finish
                    </button>
                </div>
            )}
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
            {/* Confetti Effect */}
            <Confetti active={showConfetti} />

        </div >
    );
}
