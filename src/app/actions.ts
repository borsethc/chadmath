'use server';

import { createOrUpdateStudent, addSession, getStudent, getAllStudents } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function loginAction(studentId: string) {
    if (!studentId || studentId.trim() === "") {
        return { success: false, message: "Invalid Student ID" };
    }
    const student = await createOrUpdateStudent(studentId);
    return { success: true, allTimeHigh: student.allTimeHigh };
}

export async function checkDailyStats(studentId: string) {
    if (!studentId) return { count: 0, allowed: true };
    const student = await getStudent(studentId);
    if (!student) return { count: 0, allowed: true };

    const todayOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Chicago" };
    const today = new Date().toLocaleDateString("en-US", todayOptions);

    const todaySessions = student.sessions.filter(s =>
        new Date(s.timestamp).toLocaleDateString("en-US", todayOptions) === today
    );

    return {
        count: todaySessions.length,
        allowed: true
    };
}

export async function logSessionAction(
    studentId: string,
    score: number,
    total: number,
    gameType: string,
    wrong: number,
    isMultipleChoice: boolean,
    selectedFactors: string[],
    assessmentTier?: string
) {
    const session = await addSession(studentId, {
        score,
        total,
        gameType,
        wrong,
        isMultipleChoice,
        selectedFactors,
        assessmentTier
    });

    // Check if new all time high was set (we'd need to re-fetch student or trust logic)
    // For simplicity, let's just re-fetch student to get latest high score if needed, 
    // or we can optimize later. But actually addSession returns the session, not the student.
    // Let's modify addSession to return something useful or just fetch student.
    const student = await getStudent(studentId);

    revalidatePath('/dashboard');
    return { success: true, allTimeHigh: student?.allTimeHigh };
}

export async function getDashboardData() {
    const students = await getAllStudents();
    // Convert to array and sort by last seen (descending)
    return students.sort((a, b) =>
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
}
