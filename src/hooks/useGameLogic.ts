"use client";

import { useState, useEffect, useCallback, useRef } from "react";



export type GameState = "waiting" | "revealed" | "correct";
export type FactorGroup = "2-4" | "5-7" | "8-9";
export type GameMode = "multiplication" | "division" | "assessment" | "tables";

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
    operator: "×" | "÷";
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
    const [selectedTables, setSelectedTables] = useState<number[]>([2]); // Default to x2 table array
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

    // Reset stats when game starts (Moved to bottom to access nextQuestion)

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


        // Generate Multiplication/Division with Adaptive Logic
        // Select Factors
        let f1, f2;

        if (mode === "assessment") {
            f1 = Math.floor(Math.random() * 8) + 2;
            f2 = Math.floor(Math.random() * 8) + 2;
        } else if (mode === "tables") {
            // Table Mode: Randomly select one of the active tables
            // If none selected (should be blocked by UI), default to 2
            const activeTables = selectedTables.length > 0 ? selectedTables : [2];
            const table = activeTables[Math.floor(Math.random() * activeTables.length)];

            f1 = table;
            f2 = Math.floor(Math.random() * 9) + 1; // 1 to 9

            // Randomly swap for display variety? User said "Occasionally flip"
            if (Math.random() > 0.5) {
                [f1, f2] = [f2, f1];
            }
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

            // Safety check: ensure candidates is not empty
            if (candidates.length === 0) {
                candidates.push({ f1: 2, f2: 2, weight: 1 });
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
            // Fallback if float math weirdness (r > 0 at end)
            if (!selected && candidates.length > 0) selected = candidates[0];

            f1 = selected.f1;
            f2 = selected.f2;
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
            const optionsSet = new Set<number>();
            optionsSet.add(answer);

            while (optionsSet.size < numOptions) {
                const range = 10;
                // Generate a random number around the answer
                const offset = Math.floor(Math.random() * (range * 2 + 1)) - range; // -10 to +10
                const val = Math.max(1, answer + offset); // Ensure positive

                if (val !== answer) {
                    optionsSet.add(val);
                }
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
    }, [selectedGroups, mode, mastery, selectedTables]);

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
        // Validation Logic
        {
            const val = parseInt(input);
            if (!isNaN(val) && val === currentQuestion.answer) isCorrect = true;
        }

        if (isCorrect) {
            // Stop the Smart Timer immediately
            if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

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
            setStreak(0); // Reset streak to correct sound pitch logic

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

                // Show red flash for a moment before moving on
                setIsWrong(true);
                setTimeout(() => {
                    setIsWrong(false);
                    setUserInput("");
                    nextQuestion();
                }, 500);
            } else {
                // Practice Mode
                setIsWrong(true);
                setStats((prev) => ({ ...prev, wrongAttempts: prev.wrongAttempts + 1 }));

                // Smart Retry: If MC mode (Adaptive), Queue for retry!
                // "If no answer" or "Wrong answer" -> Same effect in this logic flow
                // Actually, if they type wrong, we usually just shake and let them try again?
                // But for MC, we want to show answer and move on, then retry.

                if (isMultipleChoice) {
                    // For MC, wrong answer means "Show Red + Retry Later"
                    // We DO NOT set "revealed" immediately, because that hides the buttons!
                    // We keep it in "waiting" state but with isWrong=true.

                    // Add to Retry Queue!
                    // Insert at front (Next) or slightly delayed?
                    // User asked: "Repeat it again soon"
                    // Let's insert at index 1 (after next question) so it's not immediate?
                    // Or retryQueue is a FIFO. unshift puts it at front.
                    retryQueue.current.unshift(currentQuestion);

                    setTimeout(() => {
                        setIsWrong(false);
                        setUserInput(""); // Clear input so red highlight goes away
                        nextQuestion();
                    }, NEXT_QUESTION_DELAY_MS);

                } else {
                    // Typing mode: Standard shake and retry immediately
                    setTimeout(() => {
                        setIsWrong(false);
                        setUserInput("");
                    }, 500);
                }
            }
        }
    }, [currentQuestion, gameState, nextQuestion, mode, isMultipleChoice]); // Added isMultipleChoice

    // Formatting input (unchanged logic mostly)
    const setInput = (val: string) => {
        console.log("setInput called with:", val, "MC:", isMultipleChoice, "State:", gameState);
        if (gameState !== "waiting") return;
        setUserInput(val);
        if (currentQuestion) {

            // Multiple Choice: Wait for user to click button!
            if (isMultipleChoice) {
                // Verify value matches an option? No, handleAnswer does check.
                // But we shouldn't auto-permit unless it's from a button click (which calls setInput).
                // The button click calls setInput.
                // So we SHOULD call handleAnswer here IF it came from a button.
                // But setInput is also called by typing?
                // In MC mode, typing is disabled (input readonly).
                // So setInput ONLY comes from buttons.
                handleAnswer(val);
                return;
            }

            // Typing Mode Logic
            {
                const answerStr = currentQuestion.answer.toString();

                // Check for immediate correctness
                if (val === answerStr) {
                    // Slight delay to ensure the UI updates with the full number before processing
                    setTimeout(() => handleAnswer(val), 100);
                    return;
                }

                // If not correct, check if we should submit anyway (e.g. length limit reached)
                if (val.length === answerStr.length && answerStr.length > 0) {
                    // It's wrong, but we have enough digits. Submit to trigger "Wrong" feedback.
                    setTimeout(() => handleAnswer(val), 0);
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


            if (isTimerEnabled) {
                const timerQId = currentQuestion?.id;
                revealTimerRef.current = setTimeout(() => {
                    // Guard against stale timer firing for a different question
                    if (currentQuestion?.id !== timerQId) return;

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

    // Reset stats and Start Game Loop when isRunning becomes true
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (isRunning && !hasStartedRef.current) {
            hasStartedRef.current = true;

            setStats({ correct: 0, wrongAttempts: 0, total: 0, startTime: Date.now(), history: [] });
            setStreak(0);
            setIsWrong(false);
            setGameState("waiting");
            retryQueue.current = [];
            clusterQueue.current = [];
            setSessionMasteryUpdates({});

            // Generate first question
            nextQuestion();
        } else if (!isRunning) {
            hasStartedRef.current = false;
        }
    }, [isRunning, nextQuestion]);

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
        selectedTables,
        setSelectedTables,
        sessionMasteryUpdates // Export this so PracticeMode can save it
    };
}
