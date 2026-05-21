import { NextResponse } from 'next/server';
import { createOrUpdateStudent, addSession, getStudent, getAllStudents, updateStudentProgress, deleteStudent, checkConnection } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, payload } = body;

        if (action === 'loginAction') {
            const studentId = payload.studentId;
            if (!studentId || studentId.trim() === "") {
                return NextResponse.json({ success: false, message: "Invalid Student ID" });
            }
            const student = await createOrUpdateStudent(studentId);
            return NextResponse.json({
                success: true,
                allTimeHigh: student.allTimeHigh,
                xp: student.xp || 0,
                level: student.level || 1,
                dailyStreak: student.dailyStreak || 0,
                factMastery: student.factMastery || {}
            });
        }

        if (action === 'checkDailyStats') {
            const studentId = payload.studentId;
            if (!studentId) return NextResponse.json({ count: 0, allowed: true });
            const student = await getStudent(studentId);
            if (!student) return NextResponse.json({ count: 0, allowed: true });

            const todayOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Chicago" };
            const today = new Date().toLocaleDateString("en-US", todayOptions);

            const todaySessions = student.sessions.filter(s =>
                new Date(s.timestamp).toLocaleDateString("en-US", todayOptions) === today
            );

            return NextResponse.json({
                count: todaySessions.length,
                allowed: true
            });
        }

        if (action === 'logSessionAction') {
            const { studentId, score, total, gameType, wrong, isMultipleChoice, selectedFactors, assessmentTier, sessionMasteryUpdates } = payload;
            
            const session = await addSession(studentId, {
                score, total, gameType, wrong, isMultipleChoice, selectedFactors, assessmentTier
            });

            const sessionXP = (score * 10) + 50;
            const student = await getStudent(studentId);
            let newLevel = student?.level || 1;
            let totalXP = (student?.xp || 0) + sessionXP;
            newLevel = Math.floor(totalXP / 1000) + 1;

            const todayOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Chicago" };
            const todayDate = new Date().toLocaleDateString("en-CA", todayOptions);
            const yesterdayDate = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", todayOptions);

            const todaySessionsCount = student?.sessions.filter(s => {
                return new Date(s.timestamp).toLocaleDateString("en-CA", todayOptions) === todayDate;
            }).length || 0;

            let currentStreak = student?.dailyStreak || 0;
            let lastUpdate = student?.lastStreakUpdate || "";
            let streakUpdated = false;

            if (todaySessionsCount >= 5) {
                if (lastUpdate === todayDate) {
                    // Already credited
                } else if (lastUpdate === yesterdayDate) {
                    currentStreak += 1;
                    lastUpdate = todayDate;
                    streakUpdated = true;
                } else {
                    currentStreak = 1;
                    lastUpdate = todayDate;
                    streakUpdated = true;
                }
            }

            await updateStudentProgress(studentId, totalXP, newLevel, streakUpdated ? currentStreak : undefined, streakUpdated ? lastUpdate : undefined, sessionMasteryUpdates);
            revalidatePath('/dashboard');

            return NextResponse.json({
                success: true,
                allTimeHigh: student?.allTimeHigh,
                xpCaughtUp: sessionXP,
                currentLevel: newLevel,
                dailyStreak: currentStreak,
                streakUpdated
            });
        }

        if (action === 'getDashboardData') {
            const students = await getAllStudents();
            const sorted = students.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
            return NextResponse.json(sorted);
        }

        if (action === 'deleteStudentAction') {
            const studentId = payload.studentId;
            if (!studentId) return NextResponse.json({ success: false, message: "Invalid student ID" });
            const success = await deleteStudent(studentId);
            if (success) {
                revalidatePath('/dashboard');
                return NextResponse.json({ success: true });
            }
            return NextResponse.json({ success: false, message: "Student not found or could not be deleted" });
        }

        if (action === 'getStudentAction') {
            const studentId = payload.studentId;
            if (!studentId) return NextResponse.json({ success: false, message: "Invalid student ID" });
            const student = await getStudent(studentId);
            return NextResponse.json({ success: !!student, student });
        }

        if (action === 'checkConnection') {
            const health = await checkConnection();
            return NextResponse.json(health);
        }

        return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });

    } catch (error) {
        console.error("API Action error:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
