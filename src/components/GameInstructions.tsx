import React from 'react';
import { Info, BookOpen, BrainCircuit, MousePointerClick, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function GameInstructions() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full max-w-2xl mt-8">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center gap-2 w-full text-white/50 hover:text-white transition-colors text-sm uppercase tracking-widest mb-4"
            >
                <Info size={16} />
                {isOpen ? "Hide Instructions" : "How to Play"}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-6 text-left max-h-[50vh] overflow-y-auto custom-scrollbar">

                            {/* The 5-Minute Habit */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-2 text-yellow-400 font-bold text-lg">
                                    <BrainCircuit size={20} />
                                    The 5-Minute Daily Habit
                                </h3>
                                <p className="text-white/80 text-sm leading-relaxed">
                                    <strong>Why only 5 minutes?</strong> Cognitive science proves that <strong>short, frequent bursts</strong> of practice build long-term memory far better than long, exhausting study grinds. Your goal is simply to complete five 1-minute sprints per day to establish automaticity and earn your daily streak!
                                </p>
                            </div>

                            <div className="w-full h-px bg-white/10 my-6" />

                            {/* Input Methods & Timer */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-indigo-400 font-bold text-lg">
                                    <MousePointerClick size={20} />
                                    How to Setup Your Session
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-white font-bold text-sm">⌨️ Input Method</span>
                                        <p className="text-white/70 text-xs leading-relaxed">
                                            <strong>Multiple Choice:</strong> Best for recognizing patterns and building early confidence.
                                            <br />
                                            <strong>Typing:</strong> Best for mastery! Forces you to recall the answer from memory.
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-emerald-400 font-bold text-sm">⏱️ Timer Mode</span>
                                        <p className="text-white/70 text-xs leading-relaxed">
                                            <strong>Off:</strong> Stress-free practice. Focus on accuracy.
                                            <br />
                                            <strong>On:</strong> Builds the rapid automaticity needed to free up your working memory for harder math concepts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/10" />

                            {/* Mastery & Heatmap Section */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-rose-400 font-bold text-lg">
                                    <TrendingUp size={20} />
                                    Tracking Your Mastery
                                </h3>
                                <p className="text-white/80 text-sm leading-relaxed">
                                    On your dashboard, you will see a color-coded grid representing your fluency for each number factor.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded-sm bg-yellow-500/50 border border-yellow-500/20" />
                                            <span className="text-yellow-400 font-bold text-sm">Yellow (Basic Recall)</span>
                                        </div>
                                        <p className="text-white/70 text-xs leading-relaxed">
                                            <strong>Multiple Choice mode</strong> builds your score up to Yellow. Because Multiple Choice only proves you can recognize an answer, your progress for that number will cap out here.
                                        </p>
                                    </div>

                                    <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded-sm bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                            <span className="text-emerald-400 font-bold text-sm">Green (True Mastery)</span>
                                        </div>
                                        <p className="text-white/70 text-xs leading-relaxed">
                                            To achieve Green status, you MUST correctly answer questions using exactly <strong>Typing input</strong>. This proves you have achieved <strong>automaticity</strong> and committed the math fact to your long-term memory!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/10" />

                            {/* Beginners Section */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-2 text-indigo-400 font-bold text-lg">
                                    <BookOpen size={20} />
                                    For Beginners: Tables Mode
                                </h3>
                                <p className="text-white/80 text-sm leading-relaxed">
                                    <strong>Best for starting out!</strong> Focus on one number family at a time (like just the 2s).
                                    Perfect for learning the patterns before mixing them up.
                                </p>
                                <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60">
                                    <span className="text-indigo-300 font-bold">How to select:</span> Tap a single number button (2-9) in "Tables Mode" to practice that specific table.
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/10" />

                            {/* Advanced Section */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                                    <BrainCircuit size={20} />
                                    For All Levels: Practice Mode
                                </h3>
                                <p className="text-white/80 text-sm leading-relaxed">
                                    <strong>Best for reinforcement!</strong> Mixes numbers from different groups to test your memory.
                                    Choose a Skill Level (Level 1, Level 2, or Level 3) depending on your assessment score.
                                </p>
                                <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60">
                                    <span className="text-emerald-300 font-bold">How to select:</span> Tap a Skill Level button to practice factors appropriate for your speed.
                                    <br /><br />
                                    <span className="text-emerald-300 font-bold">Operation:</span> Choose between <strong>Multiply</strong> or <strong>Divide</strong> using the toggle below the groups.
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/10" />

                            {/* Controls */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-2 text-amber-400 font-bold text-lg">
                                    <MousePointerClick size={20} />
                                    Game Controls
                                </h3>
                                <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
                                    <li><strong>Typing Mode:</strong> Use your keyboard or the on-screen number pad.</li>
                                    <li><strong>Multiple Choice:</strong> Tap the correct answer from the options.</li>
                                    <li><strong>Assessment:</strong> 1-minute speed test. No hints, just speed!</li>
                                </ul>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
