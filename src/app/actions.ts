'use server';

import { createOrUpdateStudent, addSession, getStudent, getAllStudents } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function loginAction(studentId: string) {
    if (!studentId || studentId.trim() === "") {
        return { success: false, message: "Invalid Student ID" };
    }
    await createOrUpdateStudent(studentId);
    return { success: true };
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
    await addSession(studentId, {
        score,
        total,
        gameType,
        wrong,
        isMultipleChoice,
        selectedFactors,
        assessmentTier
    });
    revalidatePath('/dashboard');
    return { success: true };
}

export async function getDashboardData() {
    const students = await getAllStudents();
    // Convert to array and sort by last seen (descending)
    return students.sort((a, b) =>
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
}
