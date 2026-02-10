export const getFeedback = (score: number) => {
    if (score >= 55) return {
        tier: "Strong automaticity",
        range: "~55–65+ correct per minute",
        description: "Student demonstrates rapid, accurate retrieval.\nResponses are automatic; taps are fluid and efficient.\nCognitive resources are fully available for advanced math thinking.\nStudent shows confidence and independence.",
        focus: "Extension, application, and transfer"
    };
    if (score >= 40) return {
        tier: "Functional automaticity (algebra-ready)",
        range: "~40–55 correct per minute",
        description: "Most facts are retrieved instantly.\nMinimal hesitation; keypad entry is the primary time factor.\nWorking memory is largely available for higher-level reasoning.\nStudent can engage more fully with multi-step algebraic tasks.",
        focus: "Maintain automaticity; apply facts in complex contexts"
    };
    if (score >= 30) return {
        tier: "Emerging fluency",
        range: "~30–40 correct per minute",
        description: "Student shows growing recall with occasional hesitation.\nMix of instant retrieval and brief mental computation.\nAccuracy improves as familiarity increases.\nStudent benefits from short, frequent practice to increase efficiency.",
        focus: "Strengthen recall speed while maintaining accuracy"
    };
    return {
        tier: "Developing foundational fluency",
        range: "~20–30 correct per minute",
        description: "Student recognizes many facts but relies on strategies before responding.\nResponse time reflects thinking + digit entry.\nAccuracy may vary as cognitive load remains high.\nAlgebra tasks often require additional time or supports.",
        focus: "Reduce reliance on effortful strategies; increase consistency"
    };
};
