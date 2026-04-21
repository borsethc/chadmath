"use client";

import { getDashboardData } from "../actions";
import Link from 'next/link';
import { useState } from "react";

export default function Dashboard() {
    const [pin, setPin] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "5566") {
            setIsLoading(true);
            try {
                const data = await getDashboardData();
                setStudents(data);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Failed to load dashboard data.", error);
                alert("Failed to load database. Please try again.");
            } finally {
                setIsLoading(false);
            }
        } else {
            alert("Incorrect PIN.");
        }
    };

    const handleExportCSV = () => {
        if (students.length === 0) return;

        const headers = ["Student ID", "Last Seen", "Total Sessions", "Practice Time (min)", "All-Time High", "Baseline (3rd) Assessment", "Latest Assessment", "Red Factors", "Yellow Factors", "Green Factors"];

        const rows = students.map(student => {
            const factMastery = student.factMastery || {};
            const redFactors: number[] = [];
            const yellowFactors: number[] = [];
            const greenFactors: number[] = [];

            [2, 3, 4, 5, 6, 7, 8, 9].forEach(factor => {
                const keys = Object.keys(factMastery).filter(k => k.startsWith(`${factor}x`) || k.endsWith(`x${factor}`));
                const avg = keys.length ? keys.reduce((s, k) => s + factMastery[k], 0) / keys.length : 0;
                
                if (avg >= 0.8) greenFactors.push(factor);
                else if (avg >= 0.4) yellowFactors.push(factor);
                else redFactors.push(factor);
            });

            // Format date carefully to avoid CSV cell breaking
            const lastSeenStr = new Date(student.lastSeen).toLocaleString("en-US", { timeZone: "America/Chicago" }).replace(/,/g, '');

            // Get Assessments
            const assessmentsChronological = student.sessions.filter((s: any) => s.gameType === "assessment").sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const thirdAssessment = assessmentsChronological[2];
            const thirdAssessmentDisplay = thirdAssessment ? `${thirdAssessment.score}/${thirdAssessment.total} (${new Date(thirdAssessment.timestamp).toLocaleDateString("en-US", { timeZone: "America/Chicago" })})` : "-";

            const latestAssessment = student.sessions.slice().reverse().find((s: any) => s.gameType === "assessment");
            const latestAssessmentDisplay = latestAssessment ? `${latestAssessment.score}/${latestAssessment.total} (${new Date(latestAssessment.timestamp).toLocaleDateString("en-US", { timeZone: "America/Chicago" })})` : "-";

            return [
                student.id,
                lastSeenStr,
                student.sessions.length,
                student.sessions.length, // total minutes = 1 min per session
                student.allTimeHigh || "-",
                `"${thirdAssessmentDisplay}"`,
                `"${latestAssessmentDisplay}"`,
                `"${redFactors.join(", ")}"`,
                `"${yellowFactors.join(", ")}"`,
                `"${greenFactors.join(", ")}"`
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `chadmath_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-white">
                <form onSubmit={handleLogin} className="flex flex-col items-center gap-4 w-full max-w-xs p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Teacher Access</h2>
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-3xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="PIN"
                    />
                    <button type="submit" disabled={isLoading || !pin.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50">
                        {isLoading ? "Loading Data..." : "Access Dashboard"}
                    </button>
                    <a href="/" className="text-sm mt-4 text-gray-500 hover:text-white transition-colors">Back to Math Game</a>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    Student Progress Dashboard
                </h1>
                <div className="flex gap-4">
                    <button 
                        onClick={handleExportCSV} 
                        className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        Export CSV
                    </button>
                    <a href="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                        Back to Game
                    </a>
                </div>
            </header>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 font-semibold text-gray-300">Student ID</th>
                            <th className="p-4 font-semibold text-gray-300">Last Seen</th>
                            <th className="p-4 font-semibold text-gray-300">Total Sessions</th>
                            <th className="p-4 font-semibold text-gray-300">Practice Time</th>
                            <th className="p-4 font-semibold text-purple-400">All-Time High</th>
                            <th className="p-4 font-semibold text-orange-400">Baseline (3rd) Assessment</th>
                            <th className="p-4 font-semibold text-indigo-400">Latest Assessment</th>
                            <th className="p-4 font-semibold text-red-400">Red Factors</th>
                            <th className="p-4 font-semibold text-yellow-400">Yellow Factors</th>
                            <th className="p-4 font-semibold text-emerald-400">Green Factors</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {students.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    No student data recorded yet.
                                </td>
                            </tr>
                        ) : (
                            students.map((student) => {
                                const lastSession = student.sessions[student.sessions.length - 1];
                                const averageScore = student.sessions.length > 0
                                    ? (student.sessions.reduce((acc: any, s: any) => acc + s.score, 0) / student.sessions.length).toFixed(1)
                                    : "N/A";
                                
                                const assessmentsChronological = student.sessions.filter((s: any) => s.gameType === "assessment").sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                const thirdAssessment = assessmentsChronological[2];
                                const latestAssessment = student.sessions.slice().reverse().find((s: any) => s.gameType === "assessment");

                                // Calculate total time (each session is 1 min)
                                const totalMinutes = student.sessions.length;

                                // Calculate Red, Yellow, Green factors
                                const factMastery = student.factMastery || {};
                                const redFactors: number[] = [];
                                const yellowFactors: number[] = [];
                                const greenFactors: number[] = [];

                                [2, 3, 4, 5, 6, 7, 8, 9].forEach(factor => {
                                    const keys = Object.keys(factMastery).filter(k => k.startsWith(`${factor}x`) || k.endsWith(`x${factor}`));
                                    const avg = keys.length ? keys.reduce((s, k) => s + factMastery[k], 0) / keys.length : 0;
                                    
                                    if (avg >= 0.8) greenFactors.push(factor);
                                    else if (avg >= 0.4) yellowFactors.push(factor);
                                    else redFactors.push(factor); // Includes unplayed (0)
                                });

                                return (
                                    <tr key={student.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono font-medium text-indigo-300">
                                            <Link href={`/dashboard/${student.id}`} className="hover:underline hover:text-indigo-400 decoration-indigo-400">
                                                {student.id}
                                            </Link>
                                        </td>
                                        <td className="p-4 text-gray-400">
                                            {new Date(student.lastSeen).toLocaleString("en-US", { timeZone: "America/Chicago" })}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {student.sessions.length}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {totalMinutes} min
                                        </td>
                                        <td className="p-4 text-purple-300 font-bold">
                                            {student.allTimeHigh || "-"}
                                        </td>
                                        <td className="p-4 text-orange-300 font-bold">
                                            {thirdAssessment ? (
                                                <div className="flex flex-col">
                                                    <span>{thirdAssessment.score} / {thirdAssessment.total}</span>
                                                    <span className="text-[10px] text-gray-500 font-normal">
                                                        {new Date(thirdAssessment.timestamp).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
                                                    </span>
                                                </div>
                                            ) : "-"}
                                        </td>
                                        <td className="p-4 text-indigo-300 font-bold">
                                            {latestAssessment ? (
                                                <div className="flex flex-col">
                                                    <span>{latestAssessment.score} / {latestAssessment.total}</span>
                                                    <span className="text-[10px] text-gray-500 font-normal">
                                                        {new Date(latestAssessment.timestamp).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
                                                    </span>
                                                </div>
                                            ) : "-"}
                                        </td>
                                        <td className="p-4 text-red-300 font-bold tracking-widest">
                                            {redFactors.length > 0 ? redFactors.join(", ") : "-"}
                                        </td>
                                        <td className="p-4 text-yellow-300 font-bold tracking-widest">
                                            {yellowFactors.length > 0 ? yellowFactors.join(", ") : "-"}
                                        </td>
                                        <td className="p-4 text-emerald-300 font-bold tracking-widest">
                                            {greenFactors.length > 0 ? greenFactors.join(", ") : "-"}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/50">
                    <h3 className="text-lg font-medium mb-2 text-gray-300">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-black/40 rounded-lg">
                            <div className="text-2xl font-bold text-white">{students.length}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Active Students</div>
                        </div>
                        <div className="p-4 bg-black/40 rounded-lg">
                            <div className="text-2xl font-bold text-emerald-400">
                                {students.reduce((acc, s) => acc + s.sessions.length, 0)}
                            </div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Total Sessions</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
