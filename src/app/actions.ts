'use server';

import { createOrUpdateStudent, addSession, getStudent, getAllStudents, updateStudentProgress } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function loginAction(studentId: string) {
    if (!studentId || studentId.trim() === "") {
        return { success: false, message: "Invalid Student ID" };
    }
    const student = await createOrUpdateStudent(studentId);
    return {
        success: true,
        allTimeHigh: student.allTimeHigh,
        xp: student.xp || 0,
        level: student.level || 1,
        dailyStreak: student.dailyStreak || 0
    };
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

    // Calculate XP
    // 10 XP per point + 50 XP completion bonus
    const sessionXP = (score * 10) + 50;

    const student = await getStudent(studentId);
    let newLevel = student?.level || 1;
    let totalXP = (student?.xp || 0) + sessionXP;

    // Simple Level Up Logic: Every 1000 XP is a level
    // Level 1: 0-999
    // Level 2: 1000-1999
    newLevel = Math.floor(totalXP / 1000) + 1;

    // We need to update the student record with new XP/Level
    // Since addSession only adds a session, we need to explicitly update student data here
    // But wait, our DB logic is a bit split.
    // Let's rely on a new updateStudentData function or modify addSession to handle updates?
    // Actually, createOrUpdateStudent updates lastSeen/loginCount.
    // Let's manually update here for now since we are in a server action.

    // NOTE: This direct update pattern mirrors how `addSession` works in the DB file (it updates the file/DB).
    // However, `addSession` in `db.ts` doesn't take arbitrary student updates.
    // We should probably add a helper in db.ts or just inline the update logic if possible.
    // But `db.ts` is the abstraction layer. 
    // Let's modify `addSession` in `db.ts` to accept partial student updates OR add `updateStudent`.
    // For now, let's assume I can add `updateStudentXP` to db.ts or similar. 
    // Actually, looking at `db.ts`, `createOrUpdateStudent` does an upsert but resets/increments logic.
    // Let's add a specialized `updateStudentProgress(studentId, xp, level)` to `db.ts`.

    // Refactoring plan:
    // 1. I will modify `db.ts` to export `updateStudentProgress`.
    // 2. I will call it here.

    // Daily Streak Logic
    // Goal: 5 sessions per day
    const todayOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Chicago" };
    const todayDate = new Date().toLocaleDateString("en-CA", todayOptions); // YYYY-MM-DD format ideally, but en-CA does that.

    // Calculate sessions completed TODAY
    // We can reuse checkDailyStats logic or filter manually. Since checkDailyStats uses "en-US", let's be consistent or robust.
    const todaySessionsCount = student?.sessions.filter(s => {
        // Simple check: match date string
        return new Date(s.timestamp).toLocaleDateString("en-CA", todayOptions) === todayDate;
    }).length || 0; // Note: this includes the one we JUST added? actually addSession returns void/promise but we awaited it.
    // Wait, addSession reads from DB/File. If we just called addSession, and now we call getStudent, it *should* have it.
    // Let's assume student variable (line 61) has the latest session.

    // Actually, getStudent on 61 fetches fresh. So it includes the session we just added.

    let currentStreak = student?.dailyStreak || 0;
    let lastUpdate = student?.lastStreakUpdate || "";
    let streakUpdated = false;

    // Standardize yesterday comparison
    const yesterdayDate = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", todayOptions);

    if (todaySessionsCount >= 5) {
        if (lastUpdate === todayDate) {
            // Already credited for today
        } else if (lastUpdate === yesterdayDate) {
            // Continued streak!
            currentStreak += 1;
            lastUpdate = todayDate;
            streakUpdated = true;
        } else {
            // Missed a day (or first time), reset to 1
            // Even if streak was > 0, if last update wasn't Yesterday or Today, it's broken.
            // Wait, if lastUpdate was empty (new user), and they hit 5, streak becomes 1.
            currentStreak = 1;
            lastUpdate = todayDate;
            streakUpdated = true;
        }
    } else {
        // Hasn't hit 5 yet today. Streak remains as is (could be 0 or N from yesterday).
        // We don't reset until they try to update continuously and fail? 
        // Actually, if they log in tomorrow and didn't hit 5 today, the streak breaks THEN? 
        // Or does it verify on login? 
        // Simple Approach: We only update streak when they HIT the goal.
        // If they play tomorrow and hit 5, and lastUpdate is 2 days ago, it resets to 1.
        // This logic (above `else`) handles the reset correctly upon *success*.
        // Issue: Displaying "Streak: 5" when you haven't played in a week is misleading?
        // Maybe loginAction should handle the "display breakdown"?
        // For now, let's Stick to: Logic updates when you HIT the goal.
    }

    await updateStudentProgress(studentId, totalXP, newLevel, streakUpdated ? currentStreak : undefined, streakUpdated ? lastUpdate : undefined);

    revalidatePath('/dashboard');
    return {
        success: true,
        allTimeHigh: student?.allTimeHigh,
        xpCaughtUp: sessionXP,
        currentLevel: newLevel,
        dailyStreak: currentStreak,
        streakUpdated
    };
}

export async function getDashboardData() {
    const students = await getAllStudents();
    // Convert to array and sort by last seen (descending)
    return students.sort((a, b) =>
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
}
