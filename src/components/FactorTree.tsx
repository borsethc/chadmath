"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X, ArrowDown } from "lucide-react";

interface FactorTreeProps {
    initialNumber: number;
    onComplete: (result: string) => void;
}

interface TreeNode {
    id: string;
    value: number;
    isRadical: boolean;
    children?: [TreeNode, TreeNode];
    isSimplified?: boolean;
}

export function FactorTree({ initialNumber, onComplete }: FactorTreeProps) {
    const [tree, setTree] = useState<TreeNode>({
        id: "root",
        value: initialNumber,
        isRadical: true,
    });

    const [factors, setFactors] = useState({ f1: "", f2: "" });
    const [simplifyValue, setSimplifyValue] = useState("");
    const [error, setError] = useState(false);

    // findSplitTarget now returns a node and a 'reason' (split or simplify)
    const activeTarget = findActiveTarget(tree);
    const splitInputRef = useRef<HTMLInputElement>(null);
    const simplifyInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTarget) {
            if (activeTarget.action === 'split') {
                splitInputRef.current?.focus();
            } else {
                simplifyInputRef.current?.focus();
            }
        } else {
            // No active target means we are effectively done?
            // Calculate final answer and call onComplete
            const result = calculateResult(tree);
            // Add a small delay so user sees the final state
            const timer = setTimeout(() => {
                onComplete(result);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [activeTarget, tree, onComplete]);

    const handleSplit = () => {
        if (!activeTarget || activeTarget.action !== 'split') return;

        const f1 = parseInt(factors.f1);
        const f2 = parseInt(factors.f2);

        if (isNaN(f1) || isNaN(f2)) return;

        // Check if factors valid
        if (f1 * f2 === activeTarget.node.value && f1 > 1 && f2 > 1) {
            const newTree = splitNode(tree, activeTarget.node.id, f1, f2);
            setTree(newTree);
            setFactors({ f1: "", f2: "" });
            setError(false);
        } else {
            setError(true);
            setTimeout(() => setError(false), 500);
        }
    };

    const handleSimplify = () => {
        if (!activeTarget || activeTarget.action !== 'simplify') return;

        const val = parseInt(simplifyValue);
        if (isNaN(val)) return;

        // Check if correct square root
        if (val * val === activeTarget.node.value) {
            const newTree = simplifyNode(tree, activeTarget.node.id, val);
            setTree(newTree);
            setSimplifyValue("");
            setError(false);
        } else {
            setError(true);
            setTimeout(() => setError(false), 500);
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-3xl">
            <div className="relative w-full min-h-[300px] flex justify-center p-8 overflow-y-auto overflow-x-hidden">
                <AnimatePresence>
                    <NodeView node={tree} activeId={activeTarget?.node.id} />
                </AnimatePresence>
            </div>

            {activeTarget && (
                <div className="flex flex-col items-center gap-4 mt-4 p-6 bg-black/60 rounded-2xl border border-white/10 w-full max-w-sm backdrop-blur-xl shadow-2xl">
                    {activeTarget.action === 'split' ? (
                        <>
                            <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                                Factor <span className="text-white font-bold text-lg ml-2">√{activeTarget.node.value}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    ref={splitInputRef}
                                    type="number"
                                    value={factors.f1}
                                    onChange={(e) => setFactors({ ...factors, f1: e.target.value })}
                                    className={cn(
                                        "w-20 bg-white/5 border border-white/20 rounded-xl p-3 text-center text-white font-bold text-xl focus:outline-none transition-all",
                                        error ? "border-red-500 text-red-500 animate-pulse" : "focus:border-indigo-500"
                                    )}
                                    placeholder="?"
                                />
                                <span className="text-gray-400 font-bold">×</span>
                                <input
                                    type="number"
                                    value={factors.f2}
                                    onChange={(e) => setFactors({ ...factors, f2: e.target.value })}
                                    className={cn(
                                        "w-20 bg-white/5 border border-white/20 rounded-xl p-3 text-center text-white font-bold text-xl focus:outline-none transition-all",
                                        error ? "border-red-500 text-red-500 animate-pulse" : "focus:border-indigo-500"
                                    )}
                                    placeholder="?"
                                    onKeyDown={(e) => e.key === "Enter" && handleSplit()}
                                />
                            </div>

                            <button
                                onClick={handleSplit}
                                className={cn(
                                    "flex items-center justify-center w-full py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95",
                                    error ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                                )}
                            >
                                {error ? <X className="w-5 h-5" /> : <div className="flex items-center gap-2"><ArrowDown className="w-5 h-5" /> Split</div>}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                                Simplify <span className="text-emerald-400 font-bold text-lg ml-2">√{activeTarget.node.value}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-2xl text-white font-bold">=</span>
                                <input
                                    ref={simplifyInputRef}
                                    type="number"
                                    value={simplifyValue}
                                    onChange={(e) => setSimplifyValue(e.target.value)}
                                    className={cn(
                                        "w-24 bg-white/5 border border-emerald-500/30 rounded-xl p-3 text-center text-emerald-300 font-bold text-xl focus:outline-none transition-all",
                                        error ? "border-red-500 text-red-500 animate-pulse" : "focus:border-emerald-400"
                                    )}
                                    placeholder="?"
                                    onKeyDown={(e) => e.key === "Enter" && handleSimplify()}
                                />
                            </div>

                            <button
                                onClick={handleSimplify}
                                className={cn(
                                    "flex items-center justify-center w-full py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95",
                                    error ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                                )}
                            >
                                {error ? <X className="w-5 h-5" /> : <div className="flex items-center gap-2"><Check className="w-5 h-5" /> Simplify</div>}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function NodeView({ node, activeId }: { node: TreeNode, activeId?: string }) {
    const isActive = node.id === activeId;

    // Determine node appearance
    // If it's a perfect square radical (and we aren't splitting it further), highlighting it green?
    // If it's simplified (no radical), show as specific style.

    return (
        <div className="flex flex-col items-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className={cn(
                    "relative flex items-center justify-center w-16 h-16 rounded-full border-2 text-xl font-bold backdrop-blur-sm z-10 transition-all duration-300",
                    !node.isRadical ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" :
                        isActive ? "bg-indigo-500/20 border-indigo-400 text-white scale-110 shadow-[0_0_20px_rgba(99,102,241,0.5)]" :
                            "bg-black/40 border-white/10 text-gray-300"
                )}
            >
                {node.isRadical && <span className="text-sm mr-0.5 opacity-50">√</span>}
                {node.value}
            </motion.div>

            {node.children && (
                <div className="flex flex-col items-center mt-4 w-full">
                    <div className="relative h-6 w-full -mt-2 mb-2">
                        {/* Lines to children */}
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
                            <path d="M50% 0 Q50% 50% 25% 100%" vectorEffect="non-scaling-stroke" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
                            <path d="M50% 0 Q50% 50% 75% 100%" vectorEffect="non-scaling-stroke" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
                        </svg>
                    </div>
                    <div className="flex gap-4 sm:gap-8 justify-center w-full min-w-max px-4">
                        <div className="flex-1 flex justify-center">
                            <NodeView node={node.children[0]} activeId={activeId} />
                        </div>
                        <div className="flex-1 flex justify-center">
                            <NodeView node={node.children[1]} activeId={activeId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------- Helper Logic ----------------

type Target = { node: TreeNode, action: 'split' | 'simplify' };

function findActiveTarget(node: TreeNode): Target | null {
    // Traverse logic:
    // If node has children, check children.
    if (node.children) {
        const left = findActiveTarget(node.children[0]);
        if (left) return left;
        const right = findActiveTarget(node.children[1]);
        if (right) return right;
        return null;
    }

    // It is a leaf.

    // 1. If it's already simplified (not radical), ignore.
    if (!node.isRadical) return null;

    // 2. If it is a perfect square, we MUST simplify it.
    if (isPerfectSquare(node.value) && node.value > 1) { // 1 is usually simplified to just 1 which is non-radical? 
        return { node, action: 'simplify' };
    }

    // 3. If it is NOT a perfect square, can it be split?
    // Split if composite.
    if (!isPrime(node.value)) {
        return { node, action: 'split' };
    }

    // If prime and radical, it stays as is (e.g. √2).
    return null;
}

function calculateResult(node: TreeNode): string {
    // Collect all leaf values
    const leaves = getLeaves(node);

    let integerPart = 1;
    let radicalPart = 1;

    leaves.forEach(l => {
        if (l.isRadical) {
            radicalPart *= l.value;
        } else {
            integerPart *= l.value;
        }
    });

    if (radicalPart === 1) return `${integerPart}`;
    if (integerPart === 1) return `√${radicalPart}`;
    return `${integerPart}√${radicalPart}`;
}

function getLeaves(node: TreeNode): TreeNode[] {
    if (node.children) {
        return [...getLeaves(node.children[0]), ...getLeaves(node.children[1])];
    }
    return [node];
}

function isPerfectSquare(n: number): boolean {
    if (n < 0) return false;
    const sqrt = Math.sqrt(n);
    return sqrt === Math.floor(sqrt);
}

function isPrime(num: number): boolean {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
}

function splitNode(root: TreeNode, targetId: string, f1: number, f2: number): TreeNode {
    if (root.id === targetId) {
        return {
            ...root,
            children: [
                { id: root.id + "-L", value: f1, isRadical: true },
                { id: root.id + "-R", value: f2, isRadical: true }
            ]
        };
    }

    if (root.children) {
        return {
            ...root,
            children: [
                splitNode(root.children[0], targetId, f1, f2),
                splitNode(root.children[1], targetId, f1, f2)
            ] as [TreeNode, TreeNode]
        };
    }

    return root;
}

function simplifyNode(root: TreeNode, targetId: string, newValue: number): TreeNode {
    if (root.id === targetId) {
        return {
            ...root,
            value: newValue,
            isRadical: false,
            isSimplified: true
        };
    }
    if (root.children) {
        return {
            ...root,
            children: [
                simplifyNode(root.children[0], targetId, newValue),
                simplifyNode(root.children[1], targetId, newValue)
            ] as [TreeNode, TreeNode]
        };
    }
    return root;
}
