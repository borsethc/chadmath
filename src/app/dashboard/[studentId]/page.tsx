import { getStudent } from "@/lib/db";
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StudentHistory({ params }: { params: Promise<{ studentId: string }> }) {
    const { studentId } = await params;
    const student = await getStudent(studentId);

    if (!student) {
        return (
            <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold mb-4">Student Not Found</h1>
                <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 rounded-lg">Return to Dashboard</Link>
            </div>
        );
    }

    // Sort sessions by timestamp (newest first)
    const sortedSessions = [...student.sessions].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                        {student.id}
                    </h1>
                    <p className="text-gray-400 mt-1">Session History</p>
                </div>
                <Link href="/dashboard" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                    Back to Dashboard
                </Link>
            </header>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 font-semibold text-gray-300">Date/Time</th>
                            <th className="p-4 font-semibold text-gray-300">Mode</th>
                            <th className="p-4 font-semibold text-gray-300">Factors</th>
                            <th className="p-4 font-semibold text-gray-300">Score</th>
                            <th className="p-4 font-semibold text-gray-300">Accuracy</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedSessions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    No sessions recorded.
                                </td>
                            </tr>
                        ) : (
                            sortedSessions.map((session) => {
                                const accuracy = session.total > 0
                                    ? Math.round((session.score / session.total) * 100)
                                    : 0;

                                return (
                                    <tr key={session.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-gray-300 font-mono">
                                            {new Date(session.timestamp).toLocaleString("en-US", { timeZone: "America/Chicago" })}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            <span className="px-2 py-1 rounded-md bg-white/10 text-xs text-white">
                                                {session.isMultipleChoice ? "Multiple Choice" : "Typing"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {session.selectedFactors ? (
                                                <span className="text-xs font-mono text-gray-400">
                                                    {session.selectedFactors.join(", ")}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-white">
                                                {session.score}/{session.total}
                                            </span>
                                            {session.wrong > 0 && (
                                                <span className="ml-2 text-xs text-rose-400">({session.wrong} wrong)</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${accuracy >= 90 ? 'bg-emerald-500' : accuracy >= 70 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${accuracy}%` }}
                                                    />
                                                </div>
                                                <span className={`font-bold ${accuracy >= 90 ? 'text-emerald-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-rose-400'}`}>
                                                    {accuracy}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
