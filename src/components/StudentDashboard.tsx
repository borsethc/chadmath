"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PracticeMode } from "./PracticeMode";
import { cn } from "@/lib/utils";
import { Play, Flame, Trophy, TrendingUp, Settings } from "lucide-react";
import { GameMode, SkillLevel } from "@/hooks/useGameLogic";

interface StudentDashboardProps {
    studentId: string;
    isRunning: boolean;
    setIsRunning: (r: boolean) => void;
}

export interface PracticeConfig {
    mode: GameMode;
    isTimerEnabled: boolean;
    isMultipleChoice: boolean;
    selectedLevel: SkillLevel;
    selectedTables: number[];
}

export function StudentDashboard({ studentId, isRunning, setIsRunning }: StudentDashboardProps) {
    const [showPractice, setShowPractice] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<PracticeConfig | null>(null);

    // Theme support
    const [theme, setTheme] = useState("classic");

    useEffect(() => {
        // Apply theme to document element
        if (typeof window !== "undefined") {
            document.documentElement.className = theme === "classic" ? "dark" : `dark theme-${theme}`;
        }
    }, [theme]);

    // Apply default root styles based on theme directly? No, we will use globals.css

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { checkDailyStats, loginAction } = await import("../app/actions");
                const daily = await checkDailyStats(studentId);
                const loginData = await loginAction(studentId);

                setStats({
                    daily,
                    ...loginData,
                });

                // Generate Recommendation
                if (loginData.factMastery) {
                    generateRecommendation(loginData.factMastery);
                } else {
                    // Default recommendation
                    setConfig({
                        mode: "multiplication",
                        isTimerEnabled: true,
                        isMultipleChoice: false,
                        selectedLevel: "Level 1",
                        selectedTables: []
                    });
                }
            } catch (e) {
                console.error("Error loading stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [studentId]);

    const generateRecommendation = (mastery: Record<string, number>) => {
        // Basic recommendation engine
        // Find lowest mastery factors
        let lowest = 10;
        let weakestFactor = "2-4";
        let needsFocus = false;

        // Simulate grouping (extremely basic logic for now)
        const avg2to4 = Object.entries(mastery).filter(([k]) => parseInt(k.split('x')[0]) <= 4).reduce((sum, [, v]) => sum + v, 0) / 3 || 0;
        const avg5to7 = Object.entries(mastery).filter(([k]) => { const f = parseInt(k.split('x')[0]); return f >= 5 && f <= 7 }).reduce((sum, [, v]) => sum + v, 0) / 3 || 0;
        const avg8to9 = Object.entries(mastery).filter(([k]) => { const f = parseInt(k.split('x')[0]); return f >= 8 }).reduce((sum, [, v]) => sum + v, 0) / 2 || 0;

        let levelToFocus: SkillLevel = "Level 1";
        let minAvg = Math.min(avg2to4, avg5to7, avg8to9);

        if (minAvg < 5) needsFocus = true;

        if (minAvg === avg8to9) levelToFocus = "Level 3";
        else if (minAvg === avg5to7) levelToFocus = "Level 2";

        if (needsFocus) {
            setConfig({
                mode: "multiplication",
                isTimerEnabled: false, // Less pressure
                isMultipleChoice: true, // Lower cognitive load
                selectedLevel: levelToFocus,
                selectedTables: []
            });
        } else {
            // Good mastery! Recommend speed challenge
            setConfig({
                mode: "tables",
                isTimerEnabled: true,
                isMultipleChoice: false,
                selectedLevel: "Level 3",
                selectedTables: [2, 3, 4, 5, 6, 7, 8, 9] // All tables
            });
        }
    };

    if (showPractice) {
        return (
            <PracticeMode
                isRunning={isRunning}
                setIsRunning={(r) => {
                    setIsRunning(r);
                    if (!r && config) setShowPractice(false);
                }}
                studentId={studentId}
                initialConfig={config}
            />
        );
    }

    if (loading) {
        return <div className="text-white animate-pulse">Loading Dashboard...</div>;
    }

    const { daily, level = 1, xp = 0, factMastery = {}, dailyStreak = 0 } = stats || {};
    const progressPercent = Math.min((daily?.count || 0) / 5 * 100, 100);

    // Heatmap rendering logic
    const renderHeatmap = () => {
        return (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 w-full mb-6">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Factor Mastery</h3>
                <div className="grid grid-cols-8 gap-1 sm:gap-2">
                    {[2, 3, 4, 5, 6, 7, 8, 9].map(factor => {
                        // Calculate pseudo average for this factor
                        const keys = Object.keys(factMastery).filter(k => k.startsWith(`${factor}x`) || k.endsWith(`x${factor}`));
                        const avg = keys.length ? keys.reduce((s, k) => s + factMastery[k], 0) / keys.length : 0;

                        let color = "bg-white/10"; // unplayed
                        if (avg > 0 && avg < 3) color = "bg-red-500/50";
                        else if (avg >= 3 && avg < 7) color = "bg-yellow-500/50";
                        else if (avg >= 7) color = "bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]";

                        return (
                            <div key={factor} className="flex flex-col items-center gap-1">
                                <div className={cn("w-full aspect-square rounded-md transition-all", color)} />
                                <span className="text-[10px] text-white/50">{factor}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Top Stats Row */}
            <div className="flex w-full gap-4 mb-6">
                <div className="flex-1 bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Trophy className="w-5 h-5 text-yellow-400 mb-2" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</span>
                    <span className="text-3xl font-black text-white">{level}</span>
                </div>

                <div className="flex-1 bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Flame className="w-5 h-5 text-orange-400 mb-2" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Streak</span>
                    <span className="text-3xl font-black text-white">{dailyStreak}</span>
                </div>
            </div>

            {/* Daily Goal Progress */}
            <div className="w-full bg-white/5 p-6 rounded-3xl border border-white/10 mb-6 flex items-center justify-between">
                <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-white mb-1">Daily Goal</h2>
                    <p className="text-xs text-muted-foreground">Complete 5 sessions</p>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" className="stroke-white/10" strokeWidth="6" fill="none" />
                        <motion.circle
                            cx="32"
                            cy="32"
                            r="28"
                            className={cn("transition-all duration-1000 ease-out", progressPercent === 100 ? "stroke-emerald-400" : "stroke-indigo-500")}
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray="176"
                            strokeDashoffset={176 - (176 * progressPercent) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute text-sm font-bold text-white">{daily?.count || 0}/5</span>
                </div>
            </div>

            {/* Mastery Heatmap */}
            {renderHeatmap()}

            {/* Recommended Play Action */}
            <button
                onClick={() => setShowPractice(true)}
                className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl p-4 transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(79,70,229,0.3)] border border-indigo-400/30"
            >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
                <div className="relative flex items-center justify-between z-10">
                    <div className="flex flex-col items-start gap-1">
                        <span className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Recommended For You
                        </span>
                        <span className="text-lg font-black">Play Daily Practice</span>
                    </div>
                    <Play className="w-8 h-8 fill-current opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
            </button>

            {/* Custom Mode & Themes row */}
            <div className="flex w-full gap-2 mt-4">
                <button
                    onClick={() => { setConfig(null); setShowPractice(true); }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                    <Settings className="w-4 h-4" /> Custom Mode
                </button>

                {level >= 2 && (
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 py-3 px-4 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest transition-colors appearance-none text-center cursor-pointer outline-none focus:border-indigo-400"
                    >
                        <option value="classic">Classic Theme</option>
                        {level >= 2 && <option value="neon">Neon Theme</option>}
                        {level >= 5 && <option value="matrix">Matrix Theme</option>}
                        {level >= 10 && <option value="sunset">Sunset Theme</option>}
                    </select>
                )}
            </div>

        </div>
    );
}
