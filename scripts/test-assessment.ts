import { getFeedback } from '../src/lib/assessment';

const testCases = [
    { score: 10, expected: "Developing foundational fluency" },
    { score: 24, expected: "Developing foundational fluency" },
    { score: 25, expected: "Emerging fluency" },
    { score: 30, expected: "Emerging fluency" },
    { score: 34, expected: "Emerging fluency" },
    { score: 35, expected: "Functional automaticity (algebra-ready)" },
    { score: 49, expected: "Functional automaticity (algebra-ready)" },
    { score: 50, expected: "Strong automaticity" },
    { score: 60, expected: "Strong automaticity" }
];

console.log("Running Assessment Logic Tests...");

let passed = 0;
testCases.forEach(({ score, expected }) => {
    const actual = getFeedback(score).tier;
    if (actual === expected) {
        console.log(`PASS: Score ${score} -> ${actual}`);
        passed++;
    } else {
        console.error(`FAIL: Score ${score} -> Expected "${expected}", got "${actual}"`);
    }
});

console.log(`\n${passed}/${testCases.length} tests passed.`);
if (passed === testCases.length) {
    console.log("All assessment logic verified.");
} else {
    process.exit(1);
}
