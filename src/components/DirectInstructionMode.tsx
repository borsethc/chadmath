"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Confetti } from "./Confetti";
import { ArrowRight, CheckCircle2, HelpCircle, RotateCcw, Sparkles, Columns2, BookOpen, Shuffle } from "lucide-react";

export interface InstructionalExpression {
    id: string;
    table: number;
    factor1: number; // Number of groups (boxes)
    factor2: number; // Number of coins in each group
    product: number;
    isSquare: boolean;
    pairKey: string;
}

const NUMBER_WORDS: Record<number, string> = {
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
};

export function numberToWord(n: number): string {
    return NUMBER_WORDS[n] || n.toString();
}

/**
 * Generates the 15 expressions for a given multiplication table (2 through 9).
 * Includes both factor orders (T × k and k × T) for every pairing with factors 2..9,
 * and includes the square fact (T × T) once per table = 15 expressions total.
 *
 * For the 2s table, (2 × 3) and (3 × 2) are placed first so that (2 × 3) is immediately
 * practiced first after the worked example, followed by the remaining pairings.
 */
export function getTableExpressions(table: number): InstructionalExpression[] {
    const allFactors = [2, 3, 4, 5, 6, 7, 8, 9];
    // Put 3 first on the 2s table so 2 × 3 and 3 × 2 are the first pair taught
    const orderedPartners =
        table === 2
            ? [3, 2, 4, 5, 6, 7, 8, 9]
            : allFactors;

    const expressions: InstructionalExpression[] = [];

    for (const partner of orderedPartners) {
        const minF = Math.min(table, partner);
        const maxF = Math.max(table, partner);
        const pairKey = `${minF}x${maxF}`;

        if (partner === table) {
            expressions.push({
                id: `${table}x${table}`,
                table,
                factor1: table,
                factor2: table,
                product: table * table,
                isSquare: true,
                pairKey,
            });
        } else {
            // Order 1: table × partner
            expressions.push({
                id: `${table}x${partner}`,
                table,
                factor1: table,
                factor2: partner,
                product: table * partner,
                isSquare: false,
                pairKey,
            });
            // Order 2: partner × table
            expressions.push({
                id: `${partner}x${table}`,
                table,
                factor1: partner,
                factor2: table,
                product: partner * table,
                isSquare: false,
                pairKey,
            });
        }
    }

    return expressions;
}

/**
 * Generates the 15-expression Review sequence for a given table,
 * guaranteeing that reversed factor orders (T × k and k × T) are separated
 * by multiple other facts and never appear adjacent.
 */
export function getReviewExpressions(table: number): InstructionalExpression[] {
    const partnerFactors = [2, 3, 4, 5, 6, 7, 8, 9].filter((f) => f !== table);

    // Split non-square partners into two halves for well-spaced interleaving
    const firstOrderFacts: InstructionalExpression[] = partnerFactors.map((k) => ({
        id: `review-${table}x${k}`,
        table,
        factor1: table,
        factor2: k,
        product: table * k,
        isSquare: false,
        pairKey: `${Math.min(table, k)}x${Math.max(table, k)}`,
    }));

    const secondOrderFacts: InstructionalExpression[] = partnerFactors.map((k) => ({
        id: `review-${k}x${table}`,
        table,
        factor1: k,
        factor2: table,
        product: k * table,
        isSquare: false,
        pairKey: `${Math.min(table, k)}x${Math.max(table, k)}`,
    }));

    const squareFact: InstructionalExpression = {
        id: `review-${table}x${table}`,
        table,
        factor1: table,
        factor2: table,
        product: table * table,
        isSquare: true,
        pairKey: `${table}x${table}`,
    };

    // Construct a deterministic interleaved order where (T × k) and (k × T)
    // are always separated by at least 4 other facts:
    // First 4 of firstOrder -> squareFact -> remaining 3 of firstOrder interleaved with shifted secondOrder
    const sequence: InstructionalExpression[] = [
        firstOrderFacts[0], // k0 (e.g. 2x3)
        firstOrderFacts[2], // k2 (e.g. 2x5)
        firstOrderFacts[4], // k4 (e.g. 2x7)
        firstOrderFacts[6], // k6 (e.g. 2x9)
        squareFact,         // TxT (e.g. 2x2)
        secondOrderFacts[0], // k0 reversed (e.g. 3x2) - 4 facts after 2x3
        firstOrderFacts[1], // k1 (e.g. 2x4)
        secondOrderFacts[2], // k2 reversed (e.g. 5x2) - 5 facts after 2x5
        firstOrderFacts[3], // k3 (e.g. 2x6)
        secondOrderFacts[4], // k4 reversed (e.g. 7x2) - 6 facts after 2x7
        firstOrderFacts[5], // k5 (e.g. 2x8)
        secondOrderFacts[6], // k6 reversed (e.g. 9x2) - 7 facts after 2x9
        secondOrderFacts[1], // k1 reversed (e.g. 4x2) - 5 facts after 2x4
        secondOrderFacts[3], // k3 reversed (e.g. 6x2) - 4 facts after 2x6
        secondOrderFacts[5], // k5 reversed (e.g. 8x2) - 3 facts after 2x8
    ];

    return sequence;
}

/**
 * Combines guided expressions across multiple selected tables (e.g. [2, 3, 4]),
 * deduplicating shared pairs while preserving paired factor order.
 */
export function getMultiTableExpressions(tables: number[]): InstructionalExpression[] {
    const cleanTables = tables.length > 0 ? [...tables].sort((a, b) => a - b) : [2];
    if (cleanTables.length === 1) {
        return getTableExpressions(cleanTables[0]);
    }

    const seenIds = new Set<string>();
    const combined: InstructionalExpression[] = [];

    for (const t of cleanTables) {
        for (const expr of getTableExpressions(t)) {
            if (!seenIds.has(expr.id)) {
                seenIds.add(expr.id);
                combined.push(expr);
            }
        }
    }

    return combined;
}

/**
 * Combines review expressions across multiple selected tables (e.g. [2, 3, 4]),
 * keeping reversed factor orders separated across the review.
 */
export function getMultiTableReviewExpressions(tables: number[]): InstructionalExpression[] {
    const cleanTables = tables.length > 0 ? [...tables].sort((a, b) => a - b) : [2];
    if (cleanTables.length === 1) {
        return getReviewExpressions(cleanTables[0]);
    }

    const seenIds = new Set<string>();
    const firstOrders: InstructionalExpression[] = [];
    const secondOrders: InstructionalExpression[] = [];
    const squares: InstructionalExpression[] = [];

    for (const t of cleanTables) {
        for (const expr of getTableExpressions(t)) {
            if (seenIds.has(expr.id)) continue;
            seenIds.add(expr.id);
            const reviewItem = { ...expr, id: `review-${expr.id}` };
            if (expr.isSquare) {
                squares.push(reviewItem);
            } else if (expr.factor1 < expr.factor2) {
                firstOrders.push(reviewItem);
            } else {
                secondOrders.push(reviewItem);
            }
        }
    }

    // Place all first-order facts and squares first, then second-order turnaround facts
    // so (A × B) and (B × A) are separated by the entire half-deck of facts.
    return [...firstOrders, ...squares, ...secondOrders];
}

/**
 * Returns the row split for rendering `coinsPerGroup` coins inside a single group box,
 * matching the reference deck coin layouts:
 * 2-5 coins: 1 row
 * 6 coins: 3 + 3
 * 7 coins: 4 + 3
 * 8 coins: 4 + 4
 * 9 coins: 5 + 4
 */
export function getCoinRows(coinsPerGroup: number): number[] {
    if (coinsPerGroup <= 5) return [coinsPerGroup];
    if (coinsPerGroup === 6) return [3, 3];
    if (coinsPerGroup === 7) return [4, 3];
    if (coinsPerGroup === 8) return [4, 4];
    return [5, 4]; // 9 coins
}

/**
 * Row distribution for group boxes:
 * Uses at most 3 boxes per row, perfectly matching the ChadMath reference deck.
 * Row 2 and Row 3 are centered underneath.
 */
export function getGroupRowsDistribution(groups: number): number[] {
    if (groups <= 3) return [groups];
    if (groups === 4) return [3, 1];
    if (groups === 5) return [3, 2];
    if (groups === 6) return [3, 3];
    if (groups === 7) return [3, 3, 1];
    if (groups === 8) return [3, 3, 2];
    if (groups === 9) return [3, 3, 3];
    return [groups];
}

interface CoinGroupPictureProps {
    groups: number;
    coinsPerGroup: number;
    highlightMode?: "all" | "first" | "none";
    showCoinLabels?: boolean;
    compact?: boolean;
    mini?: boolean;
}

export function CoinGroupPicture({
    groups,
    coinsPerGroup,
    highlightMode = "none",
    showCoinLabels = false,
    compact = false,
    mini = false,
}: CoinGroupPictureProps) {
    const coinRows = getCoinRows(coinsPerGroup);
    const rowDistribution = useMemo(() => getGroupRowsDistribution(groups), [groups]);

    const groupRows = useMemo(() => {
        const rows: number[][] = [];
        let cur = 0;
        for (const count of rowDistribution) {
            const rowIndices: number[] = [];
            for (let i = 0; i < count; i++) {
                rowIndices.push(cur++);
            }
            rows.push(rowIndices);
        }
        return rows;
    }, [rowDistribution]);

    // Coin sizing based on mode and density
    const coinSizeClass = useMemo(() => {
        if (mini) {
            return groups >= 5 || coinsPerGroup >= 5 ? "w-2 h-2 sm:w-2.5 sm:h-2.5" : "w-2.5 h-2.5 sm:w-3 sm:h-3";
        }
        if (compact) {
            if (groups >= 4 || coinsPerGroup >= 4) {
                return "w-2.5 h-2.5 sm:w-3 sm:h-3";
            }
            return "w-3.5 h-3.5 sm:w-4 sm:h-4";
        }
        // Normal mode
        if (groups >= 7 || coinsPerGroup >= 7) {
            return "w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5";
        }
        if (groups >= 4 || coinsPerGroup >= 4) {
            return "w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6";
        }
        return "w-6 h-6 sm:w-8 sm:h-8";
    }, [mini, compact, groups, coinsPerGroup]);

    const boxPaddingClass = useMemo(() => {
        if (mini) return "px-1.5 py-1 rounded-lg border";
        if (compact) {
            if (groups >= 4 || coinsPerGroup >= 4) {
                return "px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg border";
            }
            return "px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl border";
        }
        if (groups >= 7 || coinsPerGroup >= 7) {
            return "px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border-2";
        }
        if (groups >= 4 || coinsPerGroup >= 4) {
            return "px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border-2";
        }
        return "px-4 py-3 sm:px-5 sm:py-4 rounded-2xl border-2";
    }, [mini, compact, groups, coinsPerGroup]);

    const coinGapClass = useMemo(() => {
        if (mini) return "gap-0.5";
        if (compact) {
            return groups >= 4 || coinsPerGroup >= 4 ? "gap-0.5 sm:gap-1" : "gap-1";
        }
        if (groups >= 4 || coinsPerGroup >= 4) {
            return "gap-1 sm:gap-1.5 md:gap-2";
        }
        return "gap-2 sm:gap-2.5";
    }, [mini, compact, groups, coinsPerGroup]);

    const coinRowGapClass = useMemo(() => {
        if (mini) return "gap-0.5";
        if (compact) return "gap-0.5 sm:gap-1";
        return "gap-1 sm:gap-1.5";
    }, [mini, compact]);

    const boxGapClass = useMemo(() => {
        if (mini) return "gap-1";
        if (compact) return "gap-1.5 sm:gap-2";
        if (groups >= 4 || coinsPerGroup >= 4) return "gap-2 sm:gap-3";
        return "gap-3 sm:gap-4";
    }, [mini, compact, groups, coinsPerGroup]);

    const rowGapClass = useMemo(() => {
        if (mini) return "gap-1";
        if (compact) return "gap-1.5 sm:gap-2";
        if (groups >= 4 || coinsPerGroup >= 4) return "gap-2 sm:gap-2.5";
        return "gap-3 sm:gap-3.5";
    }, [mini, compact, groups, coinsPerGroup]);

    const labelClass = useMemo(() => {
        if (compact) {
            return "px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide bg-indigo-950/90 border border-indigo-500/40 text-indigo-200";
        }
        if (groups >= 4 || coinsPerGroup >= 4) {
            return "px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wide bg-indigo-950/90 border border-indigo-500/40 text-indigo-200";
        }
        return "px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wide bg-indigo-950/90 border border-indigo-500/40 text-indigo-200";
    }, [compact, groups, coinsPerGroup]);

    return (
        <div
            data-testid="coin-group-picture"
            data-groups={groups}
            data-coins-per-group={coinsPerGroup}
            className={cn(
                "flex flex-col items-center justify-center mx-auto w-full max-w-full",
                rowGapClass
            )}
        >
            {groupRows.map((rowIndices, rIdx) => (
                <div
                    key={rIdx}
                    className={cn(
                        "flex items-center justify-center flex-nowrap w-full",
                        boxGapClass
                    )}
                >
                    {rowIndices.map((groupIdx) => {
                        const isHighlighted =
                            highlightMode === "all" || (highlightMode === "first" && groupIdx === 0);
                        const isDimmed = highlightMode === "first" && groupIdx > 0;

                        return (
                            <div
                                key={groupIdx}
                                data-testid={`group-box-${groupIdx}`}
                                className="flex flex-col items-center gap-1 shrink-0"
                            >
                                <motion.div
                                    animate={{
                                        scale: highlightMode === "first" && groupIdx === 0 ? 1.04 : 1,
                                        opacity: isDimmed ? 0.55 : 1,
                                    }}
                                    transition={{ duration: 0.25 }}
                                    className={cn(
                                        "flex flex-col items-center justify-center transition-colors",
                                        boxPaddingClass,
                                        isHighlighted
                                            ? "bg-[#1a1638] border-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.35)]"
                                            : "bg-[#151329]/90 border-[#4f46e5]/50"
                                    )}
                                >
                                    <div className={cn("flex flex-col items-center", coinRowGapClass)}>
                                        {coinRows.map((rowCount, coinRowIdx) => (
                                            <div
                                                key={coinRowIdx}
                                                className={cn("flex items-center justify-center", coinGapClass)}
                                            >
                                                {Array.from({ length: rowCount }).map((__, cIdx) => (
                                                    <div
                                                        key={cIdx}
                                                        data-testid="gold-coin"
                                                        className={cn(
                                                            "rounded-full bg-[#f5b841] border-2 border-[#fde08d] shadow-[inset_0_0_0_2px_#c67d0f,0_2px_6px_rgba(0,0,0,0.45)] flex items-center justify-center shrink-0",
                                                            mini && "border shadow-none",
                                                            coinSizeClass
                                                        )}
                                                    >
                                                        {!mini && (
                                                            <div className="w-[68%] h-[68%] rounded-full border border-[#b4690e]/70 bg-[#eab338]" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>

                                {showCoinLabels && !mini && (
                                    <motion.span
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        data-testid={`coin-label-${groupIdx}`}
                                        className={labelClass}
                                    >
                                        {coinsPerGroup} coins
                                    </motion.span>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

interface DirectInstructionModeProps {
    initialTable?: number;
    initialTables?: number[];
    initialShuffle?: boolean;
    studentId: string;
    onClose: () => void;
    onSwitchToSkillLevel?: (level: "Level 1" | "Level 2" | "Level 3") => void;
}

type LessonPhase = "worked-example" | "guided" | "pair-comparison" | "review" | "complete";
type GuidedStep = 1 | 2 | 3 | 4 | 5;

export function DirectInstructionMode({
    initialTable = 2,
    initialTables,
    initialShuffle = false,
    studentId,
    onClose,
    onSwitchToSkillLevel,
}: DirectInstructionModeProps) {
    const [selectedTables, setSelectedTables] = useState<number[]>(() =>
        initialTables && initialTables.length > 0 ? [...initialTables].sort((a, b) => a - b) : [initialTable]
    );
    const [isShuffled, setIsShuffled] = useState<boolean>(initialShuffle);
    const [shuffleSeed, setShuffleSeed] = useState<number>(0);
    const [phase, setPhase] = useState<LessonPhase>("worked-example");
    const [workedExampleStep, setWorkedExampleStep] = useState<1 | 2 | 3>(1);

    // Guided lesson state (shuffled when isShuffled is enabled)
    const expressions = useMemo(() => {
        const base = getMultiTableExpressions(selectedTables);
        if (!isShuffled) return base;
        return shuffleArray(base);
    }, [selectedTables, isShuffled, shuffleSeed]);

    const reviewExpressions = useMemo(() => {
        const base = getMultiTableReviewExpressions(selectedTables);
        if (!isShuffled) return base;
        return shuffleArray(base);
    }, [selectedTables, isShuffled, shuffleSeed]);

    const [exprIndex, setExprIndex] = useState<number>(0);
    const [step, setStep] = useState<GuidedStep>(1);
    const [step5Countdown, setStep5Countdown] = useState<number>(0);
    const [step5Reward, setStep5Reward] = useState<boolean>(false);
    const [hintMessage, setHintMessage] = useState<string | null>(null);
    const [wrongChoice, setWrongChoice] = useState<string | number | null>(null);
    const [typedAnswer, setTypedAnswer] = useState<string>("");
    const [showSideBySideModal, setShowSideBySideModal] = useState<boolean>(false);

    // Review state
    const [reviewIndex, setReviewIndex] = useState<number>(0);
    const [reviewTyped, setReviewTyped] = useState<string>("");
    const [reviewHint, setReviewHint] = useState<string | null>(null);

    // Stats tracking
    const [firstTryCorrectCount, setFirstTryCorrectCount] = useState<number>(0);
    const [currentStepMissed, setCurrentStepMissed] = useState<boolean>(false);
    const [showConfetti, setShowConfetti] = useState<boolean>(false);

    const { playCorrect, playHover, playIncorrect, playComplete, initAudio } = useSoundEffects();
    const step5InputRef = useRef<HTMLInputElement>(null);
    const reviewInputRef = useRef<HTMLInputElement>(null);

    const triggerConfettiBurst = () => {
        setShowConfetti(false);
        setTimeout(() => setShowConfetti(true), 20);
        setTimeout(() => setShowConfetti(false), 2200);
    };

    const currentExpr = expressions[exprIndex] || expressions[0];
    const currentReviewExpr = reviewExpressions[reviewIndex] || reviewExpressions[0];
    const selectedTable = currentExpr?.table ?? selectedTables[0] ?? 2;
    const selectedTablesLabel =
        selectedTables.length === 1
            ? `${selectedTables[0]}s TABLE`
            : `${selectedTables.map((t) => `${t}s`).join(", ")} TABLES`;

    //Worked example uses the first expression of the table (e.g., 2 × 3 for 2s table)
    const workedExampleExpr = expressions[0];

    const resetLessonProgress = () => {
        setPhase("worked-example");
        setWorkedExampleStep(1);
        setExprIndex(0);
        setStep(1);
        setStep5Countdown(0);
        setStep5Reward(false);
        setHintMessage(null);
        setWrongChoice(null);
        setTypedAnswer("");
        setReviewIndex(0);
        setReviewTyped("");
        setReviewHint(null);
        setFirstTryCorrectCount(0);
        setCurrentStepMissed(false);
        setShowConfetti(false);
    };

    // Toggle a table/group in the multi-select bar (e.g. select 2, 3, 4)
    const handleToggleTable = (tableNum: number) => {
        setSelectedTables((prev) => {
            if (prev.includes(tableNum)) {
                if (prev.length === 1) return prev;
                return prev.filter((n) => n !== tableNum);
            }
            return [...prev, tableNum].sort((a, b) => a - b);
        });
        resetLessonProgress();
    };

    const handleSelectTable = (tableNum: number) => {
        setSelectedTables([tableNum]);
        resetLessonProgress();
    };

    // 3, 2, 1 countdown timer before the Step 5 final question appears
    useEffect(() => {
        if (phase !== "guided" || step !== 5 || step5Countdown <= 0) return;

        playHover();
        const timer = setTimeout(() => {
            setStep5Countdown((prev) => Math.max(0, prev - 1));
        }, 850);

        return () => clearTimeout(timer);
    }, [phase, step, step5Countdown, playHover]);

    // Focus numeric input on Step 5 (once countdown reaches 0) or Review
    useEffect(() => {
        if (phase === "guided" && step === 5 && step5Countdown === 0 && !step5Reward) {
            setTimeout(() => step5InputRef.current?.focus(), 80);
        } else if (phase === "review") {
            setTimeout(() => reviewInputRef.current?.focus(), 80);
        }
    }, [phase, step, step5Countdown, step5Reward, exprIndex, reviewIndex]);

    // Step 1 options: How many groups? (offer groups, coinsPerGroup, product)
    const step1Options = useMemo(() => {
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        const P = currentExpr.product;
        const set = new Set<number>([A, B !== A ? B : A + 1, P]);
        while (set.size < 3) {
            set.add(A + set.size);
        }
        return Array.from(set).sort((a, b) => a - b);
    }, [currentExpr]);

    // Step 2 options: How many coins in each group?
    const step2Options = useMemo(() => {
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        const P = currentExpr.product;
        // Match the visual ordering style from the reference image (e.g. 2, 6, 3 for 2x3)
        if (A === 2 && B === 3) return [2, 6, 3];
        const set = new Set<number>([B, A !== B ? A : B + 1, P]);
        while (set.size < 3) {
            set.add(B + set.size);
        }
        return Array.from(set);
    }, [currentExpr]);

    // Step 3 options: Match the expression (groups × coins in each group)
    const step3Options = useMemo(() => {
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        const correctExpr = `${A} × ${B}`;
        if (!currentExpr.isSquare) {
            const reversedExpr = `${B} × ${A}`;
            // Match reference image order (3 × 2, 2 × 3)
            return A < B ? [reversedExpr, correctExpr] : [correctExpr, reversedExpr];
        } else {
            // Plausible choice for square facts (e.g. A × (A*A) or (A+1) × A)
            const distractorFactor = A * A <= 9 ? A * A : A + 1;
            const distractorExpr = `${A} × ${distractorFactor}`;
            return [correctExpr, distractorExpr];
        }
    }, [currentExpr]);

    // Step 4 options: Find the product (4 multiple choice products)
    const step4Options = useMemo(() => {
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        const P = currentExpr.product;
        if (A === 2 && B === 3) return [5, 8, 6, 9];

        const opts = new Set<number>([P, A + B, P + A, Math.max(2, P - B)]);
        let offset = 1;
        while (opts.size < 4) {
            const candidate = P + offset;
            if (candidate > 1) opts.add(candidate);
            offset = offset > 0 ? -offset : -offset + 1;
        }
        return Array.from(opts);
    }, [currentExpr]);

    // Advance from Step 5 to next expression, pair comparison, or review
    const advanceAfterExpression = () => {
        const nextIdx = exprIndex + 1;
        const nextExpr = expressions[nextIdx];

        // Show the side-by-side Paired Facts Comparison screen after finishing the 2nd order of a pair,
        // or after finishing a square fact
        const finishedPair =
            currentExpr.isSquare ||
            !nextExpr ||
            nextExpr.pairKey !== currentExpr.pairKey;

        if (finishedPair) {
            setPhase("pair-comparison");
        } else {
            setExprIndex(nextIdx);
            setStep(1);
            setHintMessage(null);
            setWrongChoice(null);
            setTypedAnswer("");
            setCurrentStepMissed(false);
        }
    };

    const handleContinueFromPairComparison = () => {
        const nextIdx = exprIndex + 1;
        if (nextIdx < expressions.length) {
            setExprIndex(nextIdx);
            setStep(1);
            setHintMessage(null);
            setWrongChoice(null);
            setTypedAnswer("");
            setCurrentStepMissed(false);
            setPhase("guided");
        } else {
            // Completed all 15 guided expressions -> transition to Review!
            setReviewIndex(0);
            setReviewTyped("");
            setReviewHint(null);
            setPhase("review");
        }
    };

    // Handlers for each of the 5 guided steps
    const handleStep1Select = (choice: number) => {
        initAudio();
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        if (choice === A) {
            playCorrect(1);
            setHintMessage(null);
            setWrongChoice(null);
            setCurrentStepMissed(false);
            setStep(2);
        } else {
            playIncorrect();
            setWrongChoice(choice);
            setCurrentStepMissed(true);
            if (choice === B) {
                setHintMessage(
                    `${B} is the number of coins inside one box. Count the purple boxes instead—there are ${A} boxes (groups).`
                );
            } else {
                setHintMessage(
                    `${choice} is the total number of coins altogether. Count only the purple boxes (groups)—how many boxes are there?`
                );
            }
        }
    };

    const handleStep2Select = (choice: number) => {
        initAudio();
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        if (choice === B) {
            playCorrect(2);
            setHintMessage(null);
            setWrongChoice(null);
            setCurrentStepMissed(false);
            setStep(3);
        } else {
            playIncorrect();
            setWrongChoice(choice);
            setCurrentStepMissed(true);
            if (choice === A) {
                setHintMessage(
                    `There are ${A} boxes (groups), but look inside just the highlighted box. Count the gold coins in that one group.`
                );
            } else {
                setHintMessage(
                    `${choice} is the total across all groups. Count only the gold coins inside the single highlighted box.`
                );
            }
        }
    };

    const handleStep3Select = (choice: string) => {
        initAudio();
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        const correctExpr = `${A} × ${B}`;
        if (choice === correctExpr) {
            playCorrect(3);
            setHintMessage(null);
            setWrongChoice(null);
            setCurrentStepMissed(false);
            setStep(4);
        } else {
            playIncorrect();
            setWrongChoice(choice);
            setCurrentStepMissed(true);
            if (!currentExpr.isSquare) {
                // Reversed factor explanation required by prompt
                setHintMessage(
                    `${B} × ${A} describes ${numberToWord(B)} groups of ${numberToWord(A)}. Look back at the ${numberToWord(A)} boxes above: there are ${A} groups with ${B} coins in each group.`
                );
            } else {
                setHintMessage(
                    `${choice} does not match the picture. Look back at the ${numberToWord(A)} boxes above: there are ${A} groups with ${B} coins in each group, so the expression is ${A} × ${B}.`
                );
            }
        }
    };

    const handleStep4Select = (choice: number) => {
        initAudio();
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        const P = currentExpr.product;
        if (choice === P) {
            playCorrect(4);
            setHintMessage(null);
            setWrongChoice(null);
            setCurrentStepMissed(false);
            setTypedAnswer("");
            setStep5Reward(false);
            setStep5Countdown(3);
            setStep(5);
        } else {
            playIncorrect();
            setWrongChoice(choice);
            setCurrentStepMissed(true);
            const repeatedAddition = Array(A).fill(B).join(" + ");
            if (choice === A + B) {
                setHintMessage(
                    `${choice} is ${A} + ${B}. To find ${A} × ${B}, count all the coins in the ${A} groups of ${B} (${repeatedAddition}).`
                );
            } else {
                setHintMessage(
                    `Check the picture cue: there are ${A} groups with ${B} coins in each (${repeatedAddition}). Count all the coins and try again!`
                );
            }
        }
    };

    const handleStep5Submit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (step5Reward || step5Countdown > 0) return;
        initAudio();
        const trimmed = typedAnswer.trim();
        if (!trimmed) return;

        const val = parseInt(trimmed, 10);
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        const P = currentExpr.product;

        if (!isNaN(val) && val === P) {
            playComplete();
            triggerConfettiBurst();
            setStep5Reward(true);
            if (!currentStepMissed) {
                setFirstTryCorrectCount((c) => c + 1);
            }
            setHintMessage(null);
            setWrongChoice(null);
            setTimeout(() => {
                setStep5Reward(false);
                advanceAfterExpression();
            }, 1350);
        } else {
            playIncorrect();
            setWrongChoice(trimmed);
            setCurrentStepMissed(true);
            const repeatedAddition = Array(A).fill(B).join(" + ");
            setHintMessage(
                `${trimmed} is not quite right. Remember: ${A} × ${B} means ${A} groups of ${B} (${repeatedAddition}). Type the product and try again!`
            );
        }
    };

    const handleReviewSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        initAudio();
        const trimmed = reviewTyped.trim();
        if (!trimmed) return;

        const val = parseInt(trimmed, 10);
        const A = currentReviewExpr.factor1;
        const B = currentReviewExpr.factor2;
        const P = currentReviewExpr.product;

        if (!isNaN(val) && val === P) {
            playCorrect(reviewIndex + 1);
            triggerConfettiBurst();
            setReviewHint(null);
            setReviewTyped("");
            if (reviewIndex + 1 < reviewExpressions.length) {
                setReviewIndex((i) => i + 1);
            } else {
                playComplete();
                setShowConfetti(true);
                setPhase("complete");
                // Save mastery update in background
                import("../app/actions")
                    .then(({ logSessionAction }) => {
                        const masteryUpdates: Record<string, number> = {};
                        for (const t of selectedTables) {
                            for (let k = 2; k <= 9; k++) {
                                const key = `${Math.min(t, k)}x${Math.max(t, k)}`;
                                masteryUpdates[key] = 1.0;
                            }
                        }
                        logSessionAction(
                            studentId,
                            reviewExpressions.length,
                            reviewExpressions.length,
                            "direct-instruction",
                            0,
                            false,
                            selectedTables.map((t) => `${t}s Table`),
                            undefined,
                            masteryUpdates
                        ).catch(() => {});
                    })
                    .catch(() => {});
            }
        } else {
            playIncorrect();
            setReviewHint(
                `Hint: ${A} × ${B} means ${A} groups of ${B} (${Array(A).fill(B).join(" + ")}). Try typing the product again!`
            );
        }
    };

    // Determine partner expression for side-by-side comparison
    const pairPartnerExpr = useMemo(() => {
        const A = currentExpr.factor1;
        const B = currentExpr.factor2;
        return {
            leftFactor1: selectedTable,
            leftFactor2: A === selectedTable ? B : A,
            rightFactor1: A === selectedTable ? B : A,
            rightFactor2: selectedTable,
            product: currentExpr.product,
            isSquare: currentExpr.isSquare,
        };
    }, [currentExpr, selectedTable]);

    return (
        <div
            data-testid="direct-instruction-container"
            className="fixed inset-0 z-50 bg-[#0a0914] overflow-y-auto overscroll-y-contain touch-pan-y flex flex-col items-center px-2.5 sm:px-4"
            style={{
                paddingTop: "max(12px, env(safe-area-inset-top, 20px))",
                paddingBottom: "max(52px, env(safe-area-inset-bottom, 34px))",
            }}
        >
            {/* Background Ambience */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f14_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f14_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none -z-10" />

            <div className="w-full max-w-2xl mx-auto flex flex-col items-center pb-12 relative z-10">
                <Confetti active={showConfetti} />

                {/* Top Navigation & Skill Level / Mode Switcher */}
                <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                        ← Skill Level Menu
                    </button>

                    <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm sm:text-base tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                            ChadMath
                        </span>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400/80 hidden sm:inline">
                            • Direct Instruction
                        </span>
                    </div>

                    {onSwitchToSkillLevel && (
                        <div className="flex items-center gap-1 bg-black/50 border border-white/10 p-1 rounded-xl">
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] sm:text-[11px] font-bold">
                                Direct Instruction
                            </span>
                            {(["Level 1", "Level 2", "Level 3"] as const).map((lvl) => (
                                <button
                                    key={lvl}
                                    onClick={() => onSwitchToSkillLevel(lvl)}
                                    className="px-1.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

            {/* Table / Group Selector (Multi-select 2 through 9) + Shuffle Option */}
            <div
                data-testid="direct-instruction-table-selector"
                className="w-full bg-[#111116] border border-white/10 rounded-2xl p-3 mb-4 flex flex-col gap-2.5"
            >
                <div className="flex flex-wrap items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Select Groups ({expressions.length} Facts)
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedTables.length === 8) {
                                    setSelectedTables([2]);
                                } else {
                                    setSelectedTables([2, 3, 4, 5, 6, 7, 8, 9]);
                                }
                                resetLessonProgress();
                            }}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer ml-1"
                        >
                            {selectedTables.length === 8 ? "Reset (2s)" : "Select All"}
                        </button>
                    </div>

                    <button
                        type="button"
                        data-testid="toggle-shuffle-btn"
                        onClick={() => {
                            setIsShuffled((prev) => !prev);
                            setShuffleSeed((s) => s + 1);
                            resetLessonProgress();
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black tracking-wide border-2 flex items-center gap-2 transition-all cursor-pointer shadow-md",
                            isShuffled
                                ? "bg-emerald-950/80 border-emerald-400 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.4)] hover:bg-emerald-900/90 hover:border-emerald-300"
                                : "bg-rose-950/80 border-rose-500 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.35)] hover:bg-rose-900/90 hover:border-rose-400"
                        )}
                        title={isShuffled ? "Shuffle is ON (random fact sequence). Click to turn OFF." : "Shuffle is OFF (standard fact sequence). Click to turn ON."}
                    >
                        <Shuffle className={cn("w-3.5 h-3.5", isShuffled ? "text-emerald-300" : "text-rose-300")} />
                        <span className={cn("w-2 h-2 rounded-full", isShuffled ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-rose-500 shadow-[0_0_6px_#f43f5e]")} />
                        <span>{isShuffled ? "Shuffle: ON" : "Shuffle: OFF"}</span>
                    </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 w-full">
                    {[2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
                        const isSelected = selectedTables.includes(t);
                        return (
                            <button
                                key={t}
                                data-testid={`select-table-${t}`}
                                onClick={() => handleToggleTable(t)}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                                    isSelected
                                        ? "bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {t}s
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Classic Theme Card */}
            <div className="w-full rounded-[24px] sm:rounded-[28px] border border-white/10 bg-[#121216] p-4 sm:p-7 shadow-2xl relative overflow-hidden">
                {/* PHASE 1: WORKED EXAMPLE */}
                {phase === "worked-example" && (
                    <div data-testid="worked-example-card" className="flex flex-col items-center space-y-3.5 sm:space-y-6">
                        <div className="w-full flex flex-wrap items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-indigo-950/80 border border-indigo-500/40 text-indigo-200">
                                {selectedTablesLabel} • WORKED EXAMPLE
                            </span>
                            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-gray-400">
                                {expressions.length} EXPRESSIONS TOTAL
                            </span>
                        </div>

                        <div className="text-center space-y-1">
                            <h2 className="text-xl sm:text-3xl font-black text-white">
                                How to Read Coin Groups
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400 max-w-md">
                                Watch how we count the groups first, then the coins in one group, and write the expression in that order.
                            </p>
                        </div>

                        {/* Worked Example Picture */}
                        <div className="py-1.5 sm:py-3 w-full flex flex-col items-center">
                            <CoinGroupPicture
                                groups={workedExampleExpr.factor1}
                                coinsPerGroup={workedExampleExpr.factor2}
                                highlightMode={
                                    workedExampleStep === 1
                                        ? "all"
                                        : workedExampleStep === 2
                                        ? "first"
                                        : "all"
                                }
                                showCoinLabels={workedExampleStep >= 2}
                            />
                        </div>

                        {/* 3-Step Modeled Breakdown */}
                        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                            <div
                                onClick={() => setWorkedExampleStep(1)}
                                className={cn(
                                    "p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left cursor-pointer transition-all",
                                    workedExampleStep >= 1
                                        ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                                        : "bg-white/5 border-white/10 text-gray-400"
                                )}
                            >
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-0.5">
                                    1. Count the groups
                                </div>
                                <div className="text-sm sm:text-base font-extrabold text-white">
                                    {workedExampleExpr.factor1} groups
                                </div>
                                <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">
                                    There are {workedExampleExpr.factor1} purple boxes.
                                </p>
                            </div>

                            <div
                                onClick={() => setWorkedExampleStep(2)}
                                className={cn(
                                    "p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left cursor-pointer transition-all",
                                    workedExampleStep >= 2
                                        ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                                        : "bg-white/5 border-white/10 text-gray-400"
                                )}
                            >
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-0.5">
                                    2. Coins in one group
                                </div>
                                <div className="text-sm sm:text-base font-extrabold text-white">
                                    {workedExampleExpr.factor2} coins in each group
                                </div>
                                <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">
                                    Each box holds {workedExampleExpr.factor2} gold coins.
                                </p>
                            </div>

                            <div
                                onClick={() => setWorkedExampleStep(3)}
                                className={cn(
                                    "p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left cursor-pointer transition-all",
                                    workedExampleStep >= 3
                                        ? "bg-emerald-950/40 border-emerald-500/50 text-white"
                                        : "bg-white/5 border-white/10 text-gray-400"
                                )}
                            >
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-0.5">
                                    3. Write the expression
                                </div>
                                <div className="text-sm sm:text-base font-extrabold text-white">
                                    {workedExampleExpr.factor1} × {workedExampleExpr.factor2} = {workedExampleExpr.product}
                                </div>
                                <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">
                                    Groups × coins in each group.
                                </p>
                            </div>
                        </div>

                        <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
                            {workedExampleStep < 3 && (
                                <button
                                    data-testid="worked-example-next-step"
                                    onClick={() =>
                                        setWorkedExampleStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : 3))
                                    }
                                    className="flex-1 py-3.5 px-6 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition-all"
                                >
                                    Model Step {workedExampleStep + 1} →
                                </button>
                            )}
                            <button
                                data-testid="start-guided-lesson-btn"
                                onClick={() => {
                                    initAudio();
                                    setPhase("guided");
                                    setExprIndex(0);
                                    setStep(1);
                                    setHintMessage(null);
                                }}
                                className="flex-1 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2"
                            >
                                <span>Start {selectedTable}s Table ({expressions[0].factor1} × {expressions[0].factor2})</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* PHASE 2: 5-STEP GUIDED SEQUENCE */}
                {phase === "guided" && (
                    <div data-testid="guided-lesson-card" className="flex flex-col items-center">
                        {/* Card Top Header */}
                        <div className="w-full flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span
                                    data-testid="table-badge"
                                    className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#1d1836] border border-indigo-500/40 text-indigo-200"
                                >
                                    {selectedTable}s TABLE
                                </span>
                                <span
                                    data-testid="expression-counter"
                                    className="text-xs font-mono text-gray-400"
                                >
                                    Fact {exprIndex + 1} / {expressions.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {!currentExpr.isSquare && (
                                    <button
                                        type="button"
                                        data-testid="toggle-side-by-side-btn"
                                        onClick={() => setShowSideBySideModal((v) => !v)}
                                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-indigo-300 flex items-center gap-1 transition-all"
                                    >
                                        <Columns2 className="w-3.5 h-3.5" />
                                        <span>Compare Pair</span>
                                    </button>
                                )}
                                <span
                                    data-testid="step-indicator"
                                    className="text-xs font-mono font-bold tracking-widest text-gray-300"
                                >
                                    STEP {step} / 5
                                </span>
                            </div>
                        </div>

                        {/* 5-Segment Progress Bar */}
                        <div className="w-full grid grid-cols-5 gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <div
                                    key={s}
                                    className={cn(
                                        "h-1.5 rounded-full transition-colors duration-300",
                                        s <= step ? "bg-[#5850ec]" : "bg-white/10"
                                    )}
                                />
                            ))}
                        </div>

                        {/* Optional Inline Side-by-Side Comparison Drawer during instruction */}
                        <AnimatePresence>
                            {showSideBySideModal && !currentExpr.isSquare && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    data-testid="inline-pair-comparison"
                                    className="w-full mb-6 overflow-hidden"
                                >
                                    <div className="p-4 rounded-2xl bg-[#171625] border border-indigo-500/30 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                                                Paired Facts Side by Side ({pairPartnerExpr.leftFactor1} × {pairPartnerExpr.leftFactor2} and {pairPartnerExpr.rightFactor1} × {pairPartnerExpr.rightFactor2})
                                            </span>
                                            <button
                                                onClick={() => setShowSideBySideModal(false)}
                                                className="text-xs text-gray-400 hover:text-white"
                                            >
                                                Hide
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center gap-2">
                                                <span className="text-xs font-bold text-gray-200">
                                                    {pairPartnerExpr.leftFactor1} groups of {pairPartnerExpr.leftFactor2}
                                                </span>
                                                <CoinGroupPicture
                                                    groups={pairPartnerExpr.leftFactor1}
                                                    coinsPerGroup={pairPartnerExpr.leftFactor2}
                                                    compact
                                                />
                                                <span className="text-sm font-extrabold text-indigo-300">
                                                    {pairPartnerExpr.leftFactor1} × {pairPartnerExpr.leftFactor2} = {pairPartnerExpr.product}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center gap-2">
                                                <span className="text-xs font-bold text-gray-200">
                                                    {pairPartnerExpr.rightFactor1} groups of {pairPartnerExpr.rightFactor2}
                                                </span>
                                                <CoinGroupPicture
                                                    groups={pairPartnerExpr.rightFactor1}
                                                    coinsPerGroup={pairPartnerExpr.rightFactor2}
                                                    compact
                                                />
                                                <span className="text-sm font-extrabold text-indigo-300">
                                                    {pairPartnerExpr.rightFactor1} × {pairPartnerExpr.rightFactor2} = {pairPartnerExpr.product}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-center text-gray-300">
                                            The groups are arranged differently, and both arrangements contain {pairPartnerExpr.product} coins.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Question Heading */}
                        <div className="text-center mb-5 space-y-1.5">
                            {step === 1 && (
                                <h2
                                    data-testid="step-question-heading"
                                    className="text-2xl sm:text-3xl font-extrabold text-white"
                                >
                                    How many groups are there?
                                </h2>
                            )}
                            {step === 2 && (
                                <h2
                                    data-testid="step-question-heading"
                                    className="text-2xl sm:text-3xl font-extrabold text-white"
                                >
                                    How many coins are in each group?
                                </h2>
                            )}
                            {step === 3 && (
                                <>
                                    <h2
                                        data-testid="step-question-heading"
                                        className="text-2xl sm:text-3xl font-extrabold text-white"
                                    >
                                        Which expression fits?
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-400">
                                        Number of groups × coins in each group
                                    </p>
                                </>
                            )}
                            {step === 4 && (
                                <h2
                                    data-testid="step-question-heading"
                                    className="text-2xl sm:text-3xl font-extrabold text-white"
                                >
                                    What is the product?
                                </h2>
                            )}
                            {step === 5 && step5Countdown > 0 && (
                                <div className="space-y-1">
                                    <h2
                                        data-testid="step5-countdown-heading"
                                        className="text-xl sm:text-2xl font-extrabold text-indigo-300"
                                    >
                                        Get ready to type it from memory!
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-400">
                                        Final question coming up in...
                                    </p>
                                </div>
                            )}
                            {step === 5 && step5Countdown === 0 && (
                                <h2
                                    data-testid="step-question-heading"
                                    className="text-2xl sm:text-3xl font-extrabold text-white"
                                >
                                    What is {currentExpr.factor1} × {currentExpr.factor2}?
                                </h2>
                            )}
                        </div>

                        {/* Visual Area: Full Coin Picture (Steps 1-3) OR Shrunk Corner Cue + Growing Equation (Step 4) OR 3-2-1 Countdown / Equation + Blank Input Only (Step 5) */}
                        {step <= 3 && (
                            <motion.div
                                layoutId="coin-picture-container"
                                className="my-4 w-full flex flex-col items-center justify-center min-h-[150px]"
                            >
                                <CoinGroupPicture
                                    groups={currentExpr.factor1}
                                    coinsPerGroup={currentExpr.factor2}
                                    highlightMode={
                                        step === 1 ? "all" : step === 2 ? "first" : "all"
                                    }
                                    showCoinLabels={step === 3}
                                />
                            </motion.div>
                        )}

                        {step === 4 && (
                            <div className="w-full flex flex-col items-center my-2 space-y-5">
                                {/* Growing Equation */}
                                <motion.div
                                    initial={{ scale: 0.65, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                                    data-testid="step4-growing-equation"
                                    className="text-5xl sm:text-6xl font-black tracking-tight text-white flex items-center gap-3"
                                >
                                    <span>{currentExpr.factor1}</span>
                                    <span className="text-indigo-400">×</span>
                                    <span>{currentExpr.factor2}</span>
                                    <span className="text-gray-400">=</span>
                                    <span className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-indigo-400/70 bg-indigo-950/50 text-indigo-300">
                                        ?
                                    </span>
                                </motion.div>

                                {/* Shrinking Picture Corner / Cue */}
                                <motion.div
                                    layoutId="coin-picture-container"
                                    initial={{ scale: 1.35 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                                    data-testid="step4-shrunk-picture-cue"
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#171721] border border-white/10 self-center"
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        PICTURE CUE
                                    </span>
                                    <CoinGroupPicture
                                        groups={currentExpr.factor1}
                                        coinsPerGroup={currentExpr.factor2}
                                        mini
                                    />
                                </motion.div>
                            </div>
                        )}

                        {step === 5 && step5Countdown > 0 && (
                            <div
                                data-testid="step5-countdown-display"
                                className="w-full flex flex-col items-center justify-center py-10"
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step5Countdown}
                                        initial={{ scale: 0.4, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.5, opacity: 0 }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-indigo-600/25 border-2 border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.45)] flex items-center justify-center text-6xl sm:text-7xl font-black text-white"
                                    >
                                        {step5Countdown}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        )}

                        {step === 5 && step5Countdown === 0 && (
                            <form
                                onSubmit={handleStep5Submit}
                                data-testid="step5-form"
                                className="w-full flex flex-col items-center my-4 space-y-6"
                            >
                                <div className="flex items-center justify-center gap-3 sm:gap-4 text-5xl sm:text-6xl font-black text-white">
                                    <span data-testid="step5-equation">
                                        {currentExpr.factor1} × {currentExpr.factor2} =
                                    </span>
                                    <input
                                        ref={step5InputRef}
                                        data-testid="step5-numeric-input"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={typedAnswer}
                                        onChange={(e) => {
                                            const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                                            setTypedAnswer(digitsOnly);
                                        }}
                                        placeholder=""
                                        aria-label="Product answer"
                                        className={cn(
                                            "w-24 sm:w-28 h-16 sm:h-20 rounded-2xl bg-[#18181f] border-2 text-center text-4xl sm:text-5xl font-black focus:outline-none focus:ring-2 transition-all",
                                            step5Reward
                                                ? "border-emerald-400 text-emerald-300 bg-emerald-950/40 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-105"
                                                : "border-emerald-500 text-white focus:ring-emerald-400"
                                        )}
                                    />
                                </div>

                                <AnimatePresence>
                                    {step5Reward && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.85, y: 6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            data-testid="step5-reward-banner"
                                            className="px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-extrabold text-lg flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                                        >
                                            <span>🎉</span>
                                            <span>
                                                Awesome! {currentExpr.factor1} × {currentExpr.factor2} = {currentExpr.product}!
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!step5Reward && (
                                    <button
                                        type="submit"
                                        data-testid="step5-check-answer-btn"
                                        className="w-full max-w-md py-4 rounded-2xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-lg transition-all shadow-[0_0_25px_rgba(79,70,229,0.35)] cursor-pointer"
                                    >
                                        Check Answer
                                    </button>
                                )}
                            </form>
                        )}

                        {/* Hint / Feedback Banner on Miss */}
                        <AnimatePresence>
                            {hintMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    data-testid="hint-banner"
                                    className="w-full max-w-md my-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-medium flex items-start gap-2.5 text-left"
                                >
                                    <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                    <span>{hintMessage}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Step 1 Answer Choices */}
                        {step === 1 && (
                            <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-4">
                                {step1Options.map((opt) => (
                                    <button
                                        key={opt}
                                        data-testid={`step1-option-${opt}`}
                                        onClick={() => handleStep1Select(opt)}
                                        className={cn(
                                            "h-16 sm:h-20 rounded-2xl border text-2xl sm:text-3xl font-extrabold transition-all cursor-pointer",
                                            wrongChoice === opt
                                                ? "bg-red-500/20 border-red-500 text-red-300"
                                                : "bg-[#1b1b22] border-white/10 text-white hover:border-indigo-500/60 hover:bg-white/10"
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 2 Answer Choices */}
                        {step === 2 && (
                            <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-4">
                                {step2Options.map((opt) => (
                                    <button
                                        key={opt}
                                        data-testid={`step2-option-${opt}`}
                                        onClick={() => handleStep2Select(opt)}
                                        className={cn(
                                            "h-16 sm:h-20 rounded-2xl border text-2xl sm:text-3xl font-extrabold transition-all cursor-pointer",
                                            wrongChoice === opt
                                                ? "bg-red-500/20 border-red-500 text-red-300"
                                                : "bg-[#1b1b22] border-white/10 text-white hover:border-indigo-500/60 hover:bg-white/10"
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 3 Answer Choices */}
                        {step === 3 && (
                            <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
                                {step3Options.map((opt) => (
                                    <button
                                        key={opt}
                                        data-testid={`step3-option-${opt.replace(/\s+/g, "")}`}
                                        onClick={() => handleStep3Select(opt)}
                                        className={cn(
                                            "h-16 sm:h-20 rounded-2xl border text-2xl sm:text-3xl font-extrabold transition-all cursor-pointer",
                                            wrongChoice === opt
                                                ? "bg-red-500/20 border-red-500 text-red-300"
                                                : "bg-[#1b1b22] border-white/10 text-white hover:border-indigo-500/60 hover:bg-white/10"
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 4 Answer Choices */}
                        {step === 4 && (
                            <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
                                {step4Options.map((opt) => (
                                    <button
                                        key={opt}
                                        data-testid={`step4-option-${opt}`}
                                        onClick={() => handleStep4Select(opt)}
                                        className={cn(
                                            "h-16 sm:h-20 rounded-2xl border text-2xl sm:text-3xl font-extrabold transition-all cursor-pointer",
                                            wrongChoice === opt
                                                ? "bg-red-500/20 border-red-500 text-red-300"
                                                : "bg-[#1b1b22] border-white/10 text-white hover:border-indigo-500/60 hover:bg-white/10"
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PHASE 3: PAIRED FACTS SIDE-BY-SIDE COMPARISON SCREEN */}
                {phase === "pair-comparison" && (
                    <div
                        data-testid="paired-facts-comparison-card"
                        className="flex flex-col items-center space-y-6"
                    >
                        <div className="w-full flex items-center justify-between">
                            <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-950/80 border border-indigo-500/40 text-indigo-200">
                                {selectedTable}s table
                            </span>
                            <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
                                CHADMATH CLASSIC
                            </span>
                        </div>

                        {!pairPartnerExpr.isSquare ? (
                            <>
                                <div className="text-center space-y-1">
                                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                                        Paired Facts Side by Side
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-400">
                                        Compare how the groups are arranged for both factor orders.
                                    </p>
                                </div>

                                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        data-testid="pair-left-panel"
                                        className="p-5 rounded-2xl bg-[#181822] border border-white/10 flex flex-col items-center justify-between gap-4"
                                    >
                                        <span className="text-lg font-extrabold text-white">
                                            {pairPartnerExpr.leftFactor1} groups of {pairPartnerExpr.leftFactor2}
                                        </span>
                                        <CoinGroupPicture
                                            groups={pairPartnerExpr.leftFactor1}
                                            coinsPerGroup={pairPartnerExpr.leftFactor2}
                                            compact
                                        />
                                        <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xl font-black text-white">
                                            {pairPartnerExpr.leftFactor1} × {pairPartnerExpr.leftFactor2} ={" "}
                                            <span className="text-amber-400">{pairPartnerExpr.product}</span>
                                        </div>
                                    </div>

                                    <div
                                        data-testid="pair-right-panel"
                                        className="p-5 rounded-2xl bg-[#181822] border border-white/10 flex flex-col items-center justify-between gap-4"
                                    >
                                        <span className="text-lg font-extrabold text-white">
                                            {pairPartnerExpr.rightFactor1} groups of {pairPartnerExpr.rightFactor2}
                                        </span>
                                        <CoinGroupPicture
                                            groups={pairPartnerExpr.rightFactor1}
                                            coinsPerGroup={pairPartnerExpr.rightFactor2}
                                            compact
                                        />
                                        <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xl font-black text-white">
                                            {pairPartnerExpr.rightFactor1} × {pairPartnerExpr.rightFactor2} ={" "}
                                            <span className="text-amber-400">{pairPartnerExpr.product}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-center text-sm font-semibold text-gray-200">
                                    Both arrangements have {pairPartnerExpr.product} coins.
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center space-y-1">
                                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                                        Square Fact Summary
                                    </h2>
                                </div>

                                <div className="w-full max-w-md p-6 rounded-2xl bg-[#181822] border border-white/10 flex flex-col items-center gap-4">
                                    <span className="text-lg font-extrabold text-white">
                                        {selectedTable} groups of {selectedTable}
                                    </span>
                                    <CoinGroupPicture
                                        groups={selectedTable}
                                        coinsPerGroup={selectedTable}
                                        compact
                                    />
                                    <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xl font-black text-white">
                                        {selectedTable} × {selectedTable} ={" "}
                                        <span className="text-amber-400">{selectedTable * selectedTable}</span>
                                    </div>
                                </div>

                                <div className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-center text-sm font-semibold text-gray-200">
                                    Both factors are the same.
                                </div>
                            </>
                        )}

                        <button
                            data-testid="continue-from-pair-btn"
                            onClick={handleContinueFromPairComparison}
                            className="w-full max-w-md py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>
                                {exprIndex + 1 < expressions.length
                                    ? `Next Fact (${expressions[exprIndex + 1].factor1} × ${expressions[exprIndex + 1].factor2})`
                                    : `Start ${selectedTable}s Table Review (15 Facts)`}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* PHASE 4: TABLE REVIEW (EQUATIONS ALONE, SEPARATED FACTOR ORDERS) */}
                {phase === "review" && (
                    <div data-testid="table-review-card" className="flex flex-col items-center space-y-6">
                        <div className="w-full flex items-center justify-between">
                            <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/40 text-emerald-200">
                                {selectedTable}s TABLE • REVIEW
                            </span>
                            <span
                                data-testid="review-progress"
                                className="text-xs font-mono font-bold text-gray-300"
                            >
                                REVIEW {reviewIndex + 1} / {reviewExpressions.length}
                            </span>
                        </div>

                        <div className="text-center space-y-1">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                                Type the Product
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400">
                                Solve from the equation alone. Paired factor orders are separated across the review.
                            </p>
                        </div>

                        <form
                            onSubmit={handleReviewSubmit}
                            className="w-full flex flex-col items-center my-4 space-y-6"
                        >
                            <div className="flex items-center justify-center gap-3 sm:gap-4 text-5xl sm:text-6xl font-black text-white">
                                <span data-testid="review-equation">
                                    {currentReviewExpr.factor1} × {currentReviewExpr.factor2} =
                                </span>
                                <input
                                    ref={reviewInputRef}
                                    data-testid="review-numeric-input"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={reviewTyped}
                                    onChange={(e) => {
                                        const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                                        setReviewTyped(digitsOnly);
                                    }}
                                    placeholder=""
                                    aria-label="Review product answer"
                                    className="w-24 sm:w-28 h-16 sm:h-20 rounded-2xl bg-[#18181f] border-2 border-emerald-500 text-center text-4xl sm:text-5xl font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                                />
                            </div>

                            {reviewHint && (
                                <div
                                    data-testid="review-hint-banner"
                                    className="w-full max-w-md p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-medium flex items-start gap-2.5 text-left"
                                >
                                    <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                    <span>{reviewHint}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                data-testid="review-check-answer-btn"
                                className="w-full max-w-md py-4 rounded-2xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-lg transition-all cursor-pointer"
                            >
                                Check Answer
                            </button>
                        </form>
                    </div>
                )}

                {/* PHASE 5: TABLE LESSON COMPLETE */}
                {phase === "complete" && (
                    <div
                        data-testid="direct-instruction-complete"
                        className="flex flex-col items-center text-center space-y-6 py-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white">
                                {selectedTablesLabel} Complete!
                            </h2>
                            <p className="text-sm text-gray-300 max-w-md">
                                You completed all {expressions.length} guided expressions and all {reviewExpressions.length} review equations!
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-2xl font-black text-white">{expressions.length} / {expressions.length}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">
                                    Guided Facts
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-2xl font-black text-emerald-400">{reviewExpressions.length} / {reviewExpressions.length}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">
                                    Review Typed
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
                            <button
                                onClick={() => resetLessonProgress()}
                                className="flex-1 py-3.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Replay Selected Groups</span>
                            </button>
                            {selectedTable < 9 && (
                                <button
                                    onClick={() => handleSelectTable(selectedTable + 1)}
                                    className="flex-1 py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    <span>Next: {selectedTable + 1}s Table</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
}

