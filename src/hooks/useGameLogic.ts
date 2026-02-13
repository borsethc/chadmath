"use client";

import { useState, useEffect, useCallback, useRef } from "react";



export type GameState = "waiting" | "revealed" | "correct";
export type FactorGroup = "2-4" | "5-7" | "8-9";
export type GameMode = "multiplication" | "division" | "radicals" | "assessment";

interface SessionStats {
    correct: number;
    wrongAttempts: number;
    total: number;
    startTime: number;
    endTime?: number;
    history: {
        question: string;
        answer: number | string;
        userAnswer: string;
        isCorrect: boolean
    }[];
}

// REVEAL_DELAY_MS removed in favor of dynamic delay
const NEXT_QUESTION_DELAY_MS = 2000; // Time to show result before next

// Rename parameter
// Rename parameter
export type Question = {
    id: string;
    factor1: number | null;
    factor2: number;
    answer: number | string;
    options: (number | string)[];
    operator: "×" | "÷" | "√";
    isRetry?: boolean; // Flag to indicate if this is a retry from the queue
};

// ... (previous types remain)

// New Type for Mastery
export type FactMastery = Record<string, number>;

export function useGameLogic(
    isRunning: boolean,
    mode: GameMode = "multiplication",
    isTimerEnabled: boolean = true,
    isMultipleChoice: boolean = false,
    initialMastery: FactMastery = {}
) {
    const [selectedGroups, setSelectedGroups] = useState<FactorGroup[]>(["2-4", "5-7", "8-9"]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [userInput, setUserInput] = useState("");
    const [gameState, setGameState] = useState<GameState>("waiting");
    const [streak, setStreak] = useState(0);
    const [isWrong, setIsWrong] = useState(false);
    const [stats, setStats] = useState<SessionStats>(() => ({ correct: 0, wrongAttempts: 0, total: 0, startTime: Date.now(), history: [] }));

    // Adaptive Learning State
    const [mastery, setMastery] = useState<FactMastery>(initialMastery);
    const retryQueue = useRef<Question[]>([]);
    const clusterQueue = useRef<Question[]>([]);
    const [sessionMasteryUpdates, setSessionMasteryUpdates] = useState<FactMastery>({}); // Track session changes to sync back

    // Timer for auto-reveal (Smart Timer)
    const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Mastery Sync
    useEffect(() => {
        setMastery(initialMastery);
    }, [initialMastery]);

    // Reset stats when game starts
    useEffect(() => {
        if (isRunning) {
            setStats({ correct: 0, wrongAttempts: 0, total: 0, startTime: Date.now(), history: [] });
            setStreak(0);
            setIsWrong(false);
            setGameState("waiting");
            retryQueue.current = [];
            clusterQueue.current = [];
            setSessionMasteryUpdates({});
        }
    }, [isRunning]);

    // Helper to get mastery key
    const getFactKey = (f1: number, f2: number, op: string) => {
        // Normalize: smaller x larger for multiplication to treat AxB same as BxA
        if (op === "×") {
            const [min, max] = f1 < f2 ? [f1, f2] : [f2, f1];
            return `${min}x${max}`;
        }
        return `${f1}${op}${f2}`;
    };

    const generateQuestion = useCallback(() => {
        // 1. Priority: Retry Queue (Missed questions)
        if (retryQueue.current.length > 0) {
            const retryQ = retryQueue.current.shift();
            if (retryQ) return { ...retryQ, id: Math.random().toString(36).substring(2, 9), isRetry: true };
        }

        // 2. Priority: Cluster Queue (Current cluster)
        if (clusterQueue.current.length > 0) {
            const clusterQ = clusterQueue.current.shift();
            if (clusterQ) return { ...clusterQ, id: Math.random().toString(36).substring(2, 9) };
        }

        // 3. Generation Logic
        if (mode === "radicals") {
            // ... (Existing Radicals Logic - kept simple for now)
            const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100];
            const square = perfectSquares[Math.floor(Math.random() * perfectSquares.length)];
            const remainders = [2, 3, 5, 6, 7];
            const remainder = remainders[Math.floor(Math.random() * remainders.length)];
            const number = square * remainder;
            const root = Math.sqrt(square);
            const answer = `${root}√${remainder}`;
            return {
                id: Math.random().toString(36).substring(2, 9),
                factor1: null,
                factor2: number,
                answer: answer,
                options: [answer],
                operator: "√" as const
            };
        }

        // Generate Multiplication/Division with Adaptive Logic
        // Select Factors
        let f1, f2;

        if (mode === "assessment") {
            f1 = Math.floor(Math.random() * 8) + 2;
            f2 = Math.floor(Math.random() * 8) + 2;
        } else {
            // 4. Adaptive Selection (Smart Repetition)
            // Instead of pure random, we weight by (1.0 - mastery). Lower mastery = Higher chance.

            // Gather all candidate pairs based on selected groups
            const candidates: { f1: number, f2: number, weight: number }[] = [];

            const validFactors = new Set<number>();
            if (selectedGroups.includes("2-4")) [2, 3, 4].forEach(n => validFactors.add(n));
            if (selectedGroups.includes("5-7")) [5, 6, 7].forEach(n => validFactors.add(n));
            if (selectedGroups.includes("8-9")) [8, 9].forEach(n => validFactors.add(n));

            // If nothing selected (shouldn't happen due to UI), fallback to all
            const fOptions = validFactors.size > 0 ? Array.from(validFactors) : [2, 3, 4, 5, 6, 7, 8, 9];

            // Loop through all f1 and f2 from valid options ONLY
            for (const cf1 of fOptions) {
                for (const cf2 of fOptions) {
                    const key = getFactKey(cf1, cf2, "×"); // Use mult key for core mastery
                    const m = mastery[key] || 0;
                    // Weight: If mastery is 0, weight is 1. If mastery is 1, weight is 0.1 (small chance).
                    // Add slight base weight so perfected facts still appear occasionally.
                    const weight = Math.max(0.1, 1.0 - m);
                    candidates.push({ f1: cf1, f2: cf2, weight });
                }
            }

            // Weighted Random Selection
            const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
            let r = Math.random() * totalWeight;
            let selected = candidates[0];
            for (const c of candidates) {
                r -= c.weight;
                if (r <= 0) {
                    selected = c;
                    break;
                }
            }
            f1 = selected.f1;
            f2 = selected.f2;

            // 5. Build Mini-Cluster (Fact Clusters)
            // If we picked a "hard" fact (low mastery), queue up related facts.
            // Only do this occasionally or if mastery is low to avoid predictability overload.
            const key = getFactKey(f1, f2, "×");
            if ((mastery[key] || 0) < 0.6) {
                // Create Cluster: Commutative property + Neighbors
                // e.g. 6x7 -> Queue 7x6, maybe 6x8
                if (f1 !== f2) {
                    // Add Commutative (BxA)
                    // Determine structure for next Q
                    // For Division, it would be Product / f2 = f1
                    // For now let's just stick to the current mode's logic for the queued item
                    // We construct "Virtual Questions" to push to queue.
                    // IMPORTANT: We need full question generation logic for queued items. 
                    // Let's simplify: Just Push DATA to queue, and let logic below handle formatting?
                    // No, queue stores full Question objects.

                    // We need a helper to format a question from f1, f2.
                    // Defining helper inside or outside... let's do inline for now.
                }
            }
        }

        // Determine Question Values based on Mode
        let qFactor1, qFactor2, qAnswer: number | string, qOperator: "×" | "÷";

        if (mode === "division") {
            qFactor1 = f1 * f2;
            qFactor2 = f1;
            qAnswer = f2;
            qOperator = "÷";
        } else {
            qFactor1 = f1;
            qFactor2 = f2;
            qAnswer = f1 * f2;
            qOperator = "×";
        }

        // Randomize answer position while keeping sorted order (Existing Logic)
        const sortedOptions = (() => {
            const numOptions = 4;
            const answer = typeof qAnswer === 'number' ? qAnswer : 0;
            const ansVal = answer;
            const maxPossibleSmaller = Math.max(0, ansVal - 1);
            const maxAllowedSmaller = Math.min(numOptions - 1, maxPossibleSmaller);
            const targetSmallerCount = Math.floor(Math.random() * (maxAllowedSmaller + 1));
            const optionsSet = new Set<number>();
            optionsSet.add(answer);
            while (optionsSet.size < 1 + targetSmallerCount) {
                const range = 10;
                const minVal = Math.max(1, ansVal - range);
                const maxVal = ansVal - 1;
                const val = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
                optionsSet.add(val);
            }
            while (optionsSet.size < numOptions) {
                const range = 10;
                const minVal = ansVal + 1;
                const maxVal = ansVal + range;
                const val = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
                optionsSet.add(val);
            }
            return Array.from(optionsSet).sort((a, b) => a - b);
        })();

        return {
            id: Math.random().toString(36).substring(2, 9),
            factor1: qFactor1,
            factor2: qFactor2,
            answer: qAnswer,
            options: sortedOptions,
            operator: qOperator
        };
    }, [selectedGroups, mode, mastery]); // Added mastery dependency

    const toggleGroup = useCallback((group: FactorGroup) => {
        setSelectedGroups(prev => {
            if (prev.includes(group) && prev.length === 1) return prev;
            return prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group];
        });
    }, []);

    const nextQuestion = useCallback(() => {
        setUserInput("");
        setGameState("waiting");
        setCurrentQuestion(generateQuestion());
    }, [generateQuestion]);

    // Update Mastery Helper
    const updateMastery = (question: Question, correct: boolean) => {
        if (question.operator === "√") return; // Skip radicals for now

        let f1, f2;
        if (question.operator === "÷") {
            // 21 / 7 = 3. Factors are 7 and 3.
            f1 = question.factor2 as number;
            f2 = question.answer as number;
        } else {
            // 3 * 7 = 21. Factors are 3 and 7.
            f1 = question.factor1 as number;
            f2 = question.factor2 as number;
        }

        const key = getFactKey(f1, f2, "×");

        setMastery(prev => {
            const current = prev[key] || 0;
            // Increase on success, Decrease on failure
            // Adaptive rates:
            // Success: +0.1
            // Failure: -0.2 (Punish mistakes more to force repetition)
            let change = correct ? 0.1 : -0.2;

            // Cap between 0 and 1
            const newVal = Math.max(0, Math.min(1, current + change));

            const newMastery = { ...prev, [key]: newVal };

            // Track delta for session update
            setSessionMasteryUpdates(updates => ({ ...updates, [key]: newVal }));

            return newMastery;
        });
    };

    // Handle answer submission or timeout
    const handleAnswer = useCallback((input: string) => {
        if (!currentQuestion || gameState !== "waiting") return;

        let isCorrect = false;

        // Validation Logic
        if (mode === "radicals") {
            if (input === currentQuestion.answer) isCorrect = true;
        } else {
            const val = parseInt(input);
            if (!isNaN(val) && val === currentQuestion.answer) isCorrect = true;
        }

        if (isCorrect) {
            setGameState("correct");
            setStreak((s) => s + 1);
            updateMastery(currentQuestion, true);

            setStats((prev) => ({
                ...prev,
                correct: prev.correct + 1,
                total: prev.total + 1,
                history: [...prev.history, {
                    question: `${currentQuestion.factor1} ${currentQuestion.operator} ${currentQuestion.factor2}`,
                    answer: currentQuestion.answer,
                    userAnswer: input,
                    isCorrect: true
                }]
            }));

            // Move to next
            const delay = mode === "assessment" ? 0 : 500;
            if (mode === "assessment") nextQuestion();
            else setTimeout(nextQuestion, delay);

        } else {
            // Wrong Answer
            updateMastery(currentQuestion, false);

            if (mode === "assessment") {
                // Assessment: faster, no retry
                setStats((prev) => ({
                    ...prev,
                    wrongAttempts: prev.wrongAttempts + 1,
                    total: prev.total + 1,
                    history: [...prev.history, {
                        question: `${currentQuestion.factor1} ${currentQuestion.operator} ${currentQuestion.factor2}`,
                        answer: currentQuestion.answer,
                        userAnswer: input,
                        isCorrect: false
                    }]
                }));
                nextQuestion();
            } else {
                // Practice Mode
                setIsWrong(true);
                setStats((prev) => ({ ...prev, wrongAttempts: prev.wrongAttempts + 1 }));

                // Smart Retry: If MC mode (Adaptive), Queue for retry!
                // "If no answer" or "Wrong answer" -> Same effect in this logic flow
                // Actually, if they type wrong, we usually just shake and let them try again?
                // But for MC, we want to show answer and move on, then retry.

                if (isMultipleChoice) {
                    // For MC, wrong answer means "Reveal + Retry Later"
                    setGameState("revealed");
                    setStreak(0);

                    // Add to Retry Queue!
                    // Insert at front (Next) or slightly delayed?
                    // User asked: "Repeat it again soon"
                    // Let's insert at index 1 (after next question) so it's not immediate?
                    // Or retryQueue is a FIFO. unshift puts it at front.
                    retryQueue.current.unshift(currentQuestion);

                    setTimeout(() => {
                        setIsWrong(false);
                        nextQuestion();
                    }, NEXT_QUESTION_DELAY_MS);

                } else {
                    // Typing mode: Standard shake and retry immediately
                    setTimeout(() => setIsWrong(false), 500);
                    setUserInput("");
                }
            }
        }
    }, [currentQuestion, gameState, nextQuestion, mode, isMultipleChoice]); // Added isMultipleChoice

    // Formatting input (unchanged logic mostly)
    const setInput = (val: string) => {
        if (gameState !== "waiting") return;
        setUserInput(val);
        if (currentQuestion) {
            // ... (Existing input validation checks)
            if (mode === "radicals") {
                if (val === currentQuestion.answer) handleAnswer(val);
            } else {
                const parsed = parseInt(val);
                const answerStr = currentQuestion.answer.toString();
                if (!isNaN(parsed)) {
                    if (mode === "assessment") {
                        if (val.length >= answerStr.length) setTimeout(() => handleAnswer(val), 200);
                    } else {
                        if (parsed === currentQuestion.answer) handleAnswer(val);
                        else if (val.length >= answerStr.length) handleAnswer(val);
                    }
                }
            }
        }
    };


    // Timer Effect (Smart Timer)
    useEffect(() => {
        if (!isRunning) return;
        if (mode === "assessment") return;

        // Smart Timer Logic:
        // MC Mode: 3 seconds (Aggressive) -> Triggers Wrong/Reveal -> Retry
        // Typing Mode: 5 seconds -> Just Reveal (Old behavior) OR we can align it.
        // User request: "In multiple choice mode, Change 1: Lower response window to 2–3 seconds"

        if (gameState === "waiting") {
            let delay = 5000;
            if (isMultipleChoice) delay = 3000; // 3 seconds for MC
            if (mode === "radicals") delay = 30000; // Long timer for radicals

            if (isTimerEnabled) {
                revealTimerRef.current = setTimeout(() => {
                    // Timeout Logic
                    if (isMultipleChoice) {
                        // Treat validation timeout as WRONG + RETRY
                        updateMastery(currentQuestion!, false);
                        setGameState("revealed");
                        setStreak(0);
                        setStats((prev) => ({ ...prev, wrongAttempts: prev.wrongAttempts + 1, total: prev.total + 1 }));

                        // Queue Retry
                        if (currentQuestion) retryQueue.current.unshift(currentQuestion);

                        setTimeout(nextQuestion, NEXT_QUESTION_DELAY_MS);
                    } else {
                        // Typing Mode: Just reveal, maybe don't punish mastery as hard?
                        // Legacy behavior
                        setGameState("revealed");
                        setStreak(0);
                        setStats((prev) => ({ ...prev, total: prev.total + 1 }));
                        setTimeout(nextQuestion, NEXT_QUESTION_DELAY_MS);
                    }
                }, delay);
            }
        }

        return () => {
            if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        };
    }, [gameState, nextQuestion, isRunning, mode, currentQuestion, isMultipleChoice, isTimerEnabled]);

    return {
        currentQuestion,
        userInput,
        setInput,
        gameState,
        streak,
        isWrong,
        stats,
        selectedGroups,
        toggleGroup,
        sessionMasteryUpdates // Export this so PracticeMode can save it
    };
}
