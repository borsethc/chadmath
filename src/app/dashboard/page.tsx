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
                <a href="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                    Back to Game
                </a>
            </header>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 font-semibold text-gray-300">Student ID</th>
                            <th className="p-4 font-semibold text-gray-300">Last Seen</th>
                            <th className="p-4 font-semibold text-gray-300">Total Sessions</th>
                            <th className="p-4 font-semibold text-gray-300">Total Logins</th>
                            <th className="p-4 font-semibold text-gray-300">Total Practice Time</th>
                            <th className="p-4 font-semibold text-gray-300">Last Mode</th>
                            <th className="p-4 font-semibold text-gray-300">Last Factors</th>
                            <th className="p-4 font-semibold text-gray-300">Last Score</th>
                            <th className="p-4 font-semibold text-gray-300">Last Wrong</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {students.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                    No student data recorded yet.
                                </td>
                            </tr>
                        ) : (
                            students.map((student) => {
                                const lastSession = student.sessions[student.sessions.length - 1];
                                const averageScore = student.sessions.length > 0
                                    ? (student.sessions.reduce((acc: any, s: any) => acc + s.score, 0) / student.sessions.length).toFixed(1)
                                    : "N/A";

                                // Calculate total time (each session is 1 min)
                                const totalMinutes = student.sessions.length;

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
                                            {student.sessions.length} <span className="text-gray-500 text-xs ml-1">(Avg: {averageScore})</span>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {student.loginCount ?? (student.sessions.length > 0 ? "~" + student.sessions.length : 1)}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {totalMinutes} min
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {lastSession ? (
                                                <span className="px-2 py-1 rounded-md bg-white/10 text-xs text-white">
                                                    {lastSession.isMultipleChoice ? "Choice" : "Typing"}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {lastSession?.selectedFactors ? (
                                                <span className="text-xs font-mono text-gray-400">
                                                    {lastSession.selectedFactors.join(", ")}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {lastSession ? (
                                                <span className="font-bold text-emerald-400">
                                                    {lastSession.score ?? 0}/{lastSession.total ?? 0}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {lastSession ? (
                                                <span className="font-bold text-rose-400">
                                                    {lastSession.wrong ?? 0}
                                                </span>
                                            ) : "-"}
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
