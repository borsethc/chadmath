"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type Question = {
    id: string; // Unique ID for key mapping
    factor1: number | null; // For radicals, this might be null if we just show '√factor2'
    factor2: number; // The main number to simplify (e.g. 72 in √72)
    answer: number | string; // Can be string for radicals format (e.g. "6√2")
    options: (number | string)[]; // Mixed types for options
    operator: "×" | "÷" | "√";
};

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

export function useGameLogic(isRunning: boolean, mode: GameMode = "multiplication", timerEnabled: boolean = true) {
    const [selectedGroups, setSelectedGroups] = useState<FactorGroup[]>(["2-4", "5-7", "8-9"]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [userInput, setUserInput] = useState("");
    const [gameState, setGameState] = useState<GameState>("waiting");
    const [streak, setStreak] = useState(0);
    const [isWrong, setIsWrong] = useState(false);
    const [stats, setStats] = useState<SessionStats>(() => ({ correct: 0, wrongAttempts: 0, total: 0, startTime: Date.now(), history: [] }));

    // Timer for auto-reveal
    const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset stats when game starts
    useEffect(() => {
        if (isRunning) {
            setStats({ correct: 0, wrongAttempts: 0, total: 0, startTime: Date.now(), history: [] });
            setStreak(0);
            setIsWrong(false);
            setGameState("waiting");
        }
    }, [isRunning]);

    const generateQuestion = useCallback(() => {
        if (mode === "radicals") {
            // Pick a perfect square (4, 9, 16, 25, 36, 49, 64, 81, 100)
            const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100];
            const square = perfectSquares[Math.floor(Math.random() * perfectSquares.length)];

            // Pick a non-square multiplier (2, 3, 5, 6, 7, 8, 10...)
            // Let's keep it simple: 2, 3, 5, 6, 7, 10
            const remainders = [2, 3, 5, 6, 7];
            const remainder = remainders[Math.floor(Math.random() * remainders.length)];

            const number = square * remainder;
            const root = Math.sqrt(square); // integer
            const answer = `${root}√${remainder}`;

            // Generate options? Even if we use factor tree, we might fall back to MC or just need an Answer property.
            // Distractors:
            // 1. Wrong root (e.g. if answer 6√2, maybe 3√8 - which is technically correct but not simplified)
            // 2. Swapped (e.g. 2√6)
            // 3. Just random like 4√3

            return {
                id: Math.random().toString(36).substring(2, 9),
                factor1: null,
                factor2: number,
                answer: answer,
                options: [answer], // Placeholder if not used in tree mode
                operator: "√" as const
            };
        }

        let f1, f2;

        if (mode === "assessment") {
            f1 = Math.floor(Math.random() * 8) + 2; // 2-9
            f2 = Math.floor(Math.random() * 8) + 2; // 2-9
        } else {
            // Collect valid factors for f1 based on selected groups
            const validF1s = new Set<number>();
            if (selectedGroups.includes("2-4")) [2, 3, 4].forEach(n => validF1s.add(n));
            if (selectedGroups.includes("5-7")) [5, 6, 7].forEach(n => validF1s.add(n));
            if (selectedGroups.includes("8-9")) [8, 9].forEach(n => validF1s.add(n));

            // Default to all if somehow empty
            const f1Options = validF1s.size > 0 ? Array.from(validF1s) : [2, 3, 4, 5, 6, 7, 8, 9];

            f1 = f1Options[Math.floor(Math.random() * f1Options.length)];
            f2 = Math.floor(Math.random() * 8) + 2; // 2 to 9 (exclude 1)
        }

        // Determine Question Values based on Mode
        let qFactor1, qFactor2, qAnswer: number | string, qOperator: "×" | "÷";

        if (mode === "division") {
            // Division: Product / Factor = Answer
            // Example: 21 / 7 = 3
            // f1 is the "focused" number (e.g. 7)
            // So we want the question to be: (f1 * f2) ÷ f1 = f2
            qFactor1 = f1 * f2;
            qFactor2 = f1;
            qAnswer = f2;
            qOperator = "÷";
        } else {
            // Multiplication: Factor * Factor = Product
            qFactor1 = f1;
            qFactor2 = f2;
            qAnswer = f1 * f2;
            qOperator = "×";
        }

        // Randomize answer position while keeping sorted order
        const sortedOptions = (() => {
            const numOptions = 4;
            const answer = qAnswer;

            // 1. Determine how many numbers should be smaller than the answer (0 to 3)
            // Note: For radicals we might not use this option generation, but safe to leave or refactor
            const ansVal = typeof answer === 'number' ? answer : 0;
            const maxPossibleSmaller = Math.max(0, ansVal - 1);
            const maxAllowedSmaller = Math.min(numOptions - 1, maxPossibleSmaller);

            const targetSmallerCount = Math.floor(Math.random() * (maxAllowedSmaller + 1));

            const optionsSet = new Set<number>();
            if (typeof answer === 'number') optionsSet.add(answer);

            // 2. Generate smaller numbers
            while (optionsSet.size < 1 + targetSmallerCount) {
                const range = 10; // look within 10 numbers
                const minVal = Math.max(1, ansVal - range);
                const maxVal = ansVal - 1;
                const val = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
                optionsSet.add(val);
            }

            // 3. Generate larger numbers
            while (optionsSet.size < numOptions) {
                const range = 10;
                const minVal = ansVal + 1;
                const maxVal = ansVal + range;
                const val = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
                optionsSet.add(val);
            }

            // Sort options numerically for all numeric modes (Multiplication, Division, Assessment)
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
    }, [selectedGroups, mode]);

    const toggleGroup = useCallback((group: FactorGroup) => {
        setSelectedGroups(prev => {
            // Prevent deselecting specific group if it's the only one
            if (prev.includes(group) && prev.length === 1) return prev;
            return prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group];
        });
    }, []);

    const nextQuestion = useCallback(() => {
        setUserInput("");
        setGameState("waiting");
        setCurrentQuestion(generateQuestion());
    }, [generateQuestion]);

    // Handle answer submission or timeout
    const handleAnswer = useCallback((input: string) => {
        if (!currentQuestion || gameState !== "waiting") return;

        let isCorrect = false;

        if (mode === "radicals") {
            // String comparison for radicals
            if (input === currentQuestion.answer) {
                isCorrect = true;
            }
        } else {
            const val = parseInt(input);
            if (isNaN(val)) return;
            // Number comparison
            if (val === currentQuestion.answer) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            setGameState("correct");
            setStreak((s) => s + 1);
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

            // Move to next question after delay
            const delay = mode === "assessment" ? 0 : 500;
            if (mode === "assessment") {
                nextQuestion();
            } else {
                setTimeout(nextQuestion, delay);
            }
        } else {
            // Wrong answer logic
            if (mode === "assessment") {
                // Assessment mode: Count as wrong but move on immediately without feedback
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
                setIsWrong(true);
                setStats((prev) => ({ ...prev, wrongAttempts: prev.wrongAttempts + 1 }));
                setTimeout(() => setIsWrong(false), 500);
                setUserInput("");
            }
        }
    }, [currentQuestion, gameState, nextQuestion, mode]);

    // Formatting input
    const setInput = (val: string) => {
        if (gameState !== "waiting") return;
        setUserInput(val);

        if (currentQuestion) {
            if (mode === "radicals") {
                // Check if it matches exactly
                if (val === currentQuestion.answer) {
                    handleAnswer(val);
                }
            } else {
                const parsed = parseInt(val);
                const answerStr = currentQuestion.answer.toString();

                if (!isNaN(parsed)) {
                    // Assessment mode: Submit if length matches answer length (or we could wait for verified enter, but current UI is digit-based)
                    if (mode === "assessment") {
                        if (val.length >= answerStr.length) {
                            // Add a small delay so user sees the last digit
                            setTimeout(() => {
                                handleAnswer(val);
                            }, 200);
                        }
                    } else {
                        // Normal modes
                        if (parsed === currentQuestion.answer) {
                            handleAnswer(val);
                        } else if (val.length >= answerStr.length) {
                            handleAnswer(val);
                        }
                    }
                }
            }
        }
    };

    // Check answer on input change removed in favor of direct check in setInput


    // Timer Effect
    useEffect(() => {
        if (!isRunning) return;
        if (mode === "assessment") return; // Disable reveal timer for assessment
        if (!timerEnabled) return;

        if (gameState === "waiting") {
            const delay = mode === "radicals" ? 30000 : 5000;
            revealTimerRef.current = setTimeout(() => {
                setGameState("revealed");
                setStreak(0); // Reset streak on timeout
                setStats((prev) => ({ ...prev, total: prev.total + 1 }));
                // Automatically go to next question after showing answer
                setTimeout(nextQuestion, NEXT_QUESTION_DELAY_MS);
            }, delay);
        }

        return () => {
            if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        };
    }, [gameState, nextQuestion, isRunning, mode, currentQuestion]);

    // Initial load
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isRunning && !currentQuestion) nextQuestion();
    }, [isRunning, currentQuestion, nextQuestion]);

    return {
        currentQuestion,
        userInput,
        setInput,
        gameState,
        streak,
        isWrong,
        stats,
        selectedGroups,
        toggleGroup
    };
}
