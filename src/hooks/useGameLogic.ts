"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type Question = {
    id: string; // Unique ID for key mapping
    factor1: number;
    factor2: number;
    answer: number;
    options: number[];
    operator: "×" | "÷";
};

export type GameState = "waiting" | "revealed" | "correct";
export type FactorGroup = "2-4" | "5-7" | "8-9";
export type GameMode = "multiplication" | "division";

interface SessionStats {
    correct: number;
    wrongAttempts: number;
    total: number;
    startTime: number;
    endTime?: number;
}

const REVEAL_DELAY_MS = 5000; // 5 seconds to answer before reveal
const NEXT_QUESTION_DELAY_MS = 2000; // Time to show result before next

export function useGameLogic(isRunning: boolean, mode: GameMode = "multiplication") {
    const [selectedGroups, setSelectedGroups] = useState<FactorGroup[]>(["2-4", "5-7", "8-9"]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [userInput, setUserInput] = useState("");
    const [gameState, setGameState] = useState<GameState>("waiting");
    const [streak, setStreak] = useState(0);
    const [isWrong, setIsWrong] = useState(false);
    const [stats, setStats] = useState<SessionStats>(() => ({ correct: 0, wrongAttempts: 0, total: 0, startTime: Date.now() }));

    // Timer for auto-reveal
    const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

    const generateQuestion = useCallback(() => {
        // Collect valid factors for f1 based on selected groups
        const validF1s = new Set<number>();
        if (selectedGroups.includes("2-4")) [2, 3, 4].forEach(n => validF1s.add(n));
        if (selectedGroups.includes("5-7")) [5, 6, 7].forEach(n => validF1s.add(n));
        if (selectedGroups.includes("8-9")) [8, 9].forEach(n => validF1s.add(n));

        // Default to all if somehow empty
        const f1Options = validF1s.size > 0 ? Array.from(validF1s) : [2, 3, 4, 5, 6, 7, 8, 9];

        const f1 = f1Options[Math.floor(Math.random() * f1Options.length)];
        const f2 = Math.floor(Math.random() * 8) + 2; // 2 to 9 (exclude 1)

        // Determine Question Values based on Mode
        let qFactor1, qFactor2, qAnswer, qOperator: "×" | "÷";

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
        const numOptions = 4;
        const answer = qAnswer;

        // 1. Determine how many numbers should be smaller than the answer (0 to 3)
        const maxPossibleSmaller = Math.max(0, answer - 1);
        const maxAllowedSmaller = Math.min(numOptions - 1, maxPossibleSmaller);

        const targetSmallerCount = Math.floor(Math.random() * (maxAllowedSmaller + 1));

        const optionsSet = new Set<number>();
        optionsSet.add(answer);

        // 2. Generate smaller numbers
        while (optionsSet.size < 1 + targetSmallerCount) {
            const range = 10; // look within 10 numbers
            const minVal = Math.max(1, answer - range);
            const maxVal = answer - 1;
            const val = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
            optionsSet.add(val);
        }

        // 3. Generate larger numbers
        while (optionsSet.size < numOptions) {
            const range = 10;
            const minVal = answer + 1;
            const maxVal = answer + range;
            const val = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
            optionsSet.add(val);
        }

        return {
            id: Math.random().toString(36).substring(2, 9),
            factor1: qFactor1,
            factor2: qFactor2,
            answer: qAnswer,
            options: Array.from(optionsSet).sort((a, b) => a - b),
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

        const val = parseInt(input);
        if (isNaN(val)) return;

        if (val === currentQuestion.answer) {
            setGameState("correct");
            setStreak((s) => s + 1);
            setStats((prev) => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));

            // Move to next question after delay
            setTimeout(nextQuestion, 500);
        } else {
            // Wrong answer logic
            setIsWrong(true);
            setStats((prev) => ({ ...prev, wrongAttempts: prev.wrongAttempts + 1 }));
            setTimeout(() => setIsWrong(false), 500);
            setUserInput("");
        }
    }, [currentQuestion, gameState, nextQuestion]);

    // Formatting input
    const setInput = (val: string) => {
        if (gameState !== "waiting") return;
        setUserInput(val);

        if (currentQuestion) {
            const parsed = parseInt(val);
            const answerStr = currentQuestion.answer.toString();

            if (!isNaN(parsed)) {
                if (parsed === currentQuestion.answer) {
                    handleAnswer(val);
                } else if (val.length >= answerStr.length) {
                    handleAnswer(val);
                }
            }
        }
    };

    // Check answer on input change removed in favor of direct check in setInput


    // Timer Effect
    useEffect(() => {
        if (!isRunning) return;
        if (gameState === "waiting") {
            revealTimerRef.current = setTimeout(() => {
                setGameState("revealed");
                setStreak(0); // Reset streak on timeout
                setStats((prev) => ({ ...prev, total: prev.total + 1 }));
                // Automatically go to next question after showing answer
                setTimeout(nextQuestion, NEXT_QUESTION_DELAY_MS);
            }, REVEAL_DELAY_MS);
        }

        return () => {
            if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        };
    }, [gameState, nextQuestion, isRunning]);

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
