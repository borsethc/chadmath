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

    const today = new Date().toDateString();
    const todaySessions = student.sessions.filter(s =>
        new Date(s.timestamp).toDateString() === today
    );

    return {
        count: todaySessions.length,
        allowed: todaySessions.length < 5
    };
}

export async function logSessionAction(studentId: string, score: number, total: number, gameType: string) {
    await addSession(studentId, {
        score,
        total,
        gameType
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
