import React from 'react';
import { Info, BookOpen, BrainCircuit, MousePointerClick } from 'lucide-react';
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
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-6 text-left">

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
                                            <strong>On:</strong> Builds speed and fluency for tests.
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
                                    Choose from Small (2-4), Medium (5-7), or Large (8-9) groups.
                                </p>
                                <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60">
                                    <span className="text-emerald-300 font-bold">How to select:</span> Tap one or more group buttons (e.g., "2-4") to mix them together.
                                    Click the <span className="inline-block border border-white/20 rounded px-1 mx-1">×</span> to remove a selection.
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
        </div>
    );
}
