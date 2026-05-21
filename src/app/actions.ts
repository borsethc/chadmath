// Hybrid Client Actions
// Intelligently switches between Offline Local Storage and Online Postgres API

export type Session = {
    id: string;
    timestamp: string;
    score: number;
    wrong: number;
    total: number;
    gameType: string;
    isMultipleChoice: boolean;
    selectedFactors: string[];
    assessmentTier?: string;
};

export type Student = {
    id: string;
    lastSeen: string;
    loginCount: number;
    sessions: Session[];
    allTimeHigh?: number;
    xp: number;
    level: number;
    dailyStreak: number;
    lastStreakUpdate: string;
    factMastery: Record<string, number>;
};

const isOffline = process.env.NEXT_PUBLIC_IS_OFFLINE === 'true';

// --- Local Storage Helpers ---
const getStudentsDb = (): Record<string, Student> => {
    if (typeof window === "undefined") return {};
    const data = localStorage.getItem("chadmath_db");
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
};

const saveStudentsDb = (db: Record<string, Student>) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("chadmath_db", JSON.stringify(db));
};

const getStudent = (studentId: string): Student | null => {
    const db = getStudentsDb();
    return db[studentId] || null;
};

// --- API Wrapper Helpers ---
async function fetchApi(action: string, payload: any) {
    const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
    });
    return res.json();
}

// --- Exported Actions ---

export async function loginAction(studentId: string) {
    if (isOffline) {
        if (!studentId || studentId.trim() === "") {
            return { success: false, message: "Invalid Student ID" };
        }
        try {
            const db = getStudentsDb();
            const now = new Date().toISOString();
            let student = db[studentId];

            if (student) {
                student.lastSeen = now;
                student.loginCount = (student.loginCount || student.sessions?.length || 0) + 1;
            } else {
                student = {
                    id: studentId, lastSeen: now, loginCount: 1, sessions: [],
                    xp: 0, level: 1, dailyStreak: 0, lastStreakUpdate: "", factMastery: {}
                };
            }

            let realHigh = 0;
            student.sessions?.forEach(session => {
                if (session.gameType === "assessment" && session.isMultipleChoice !== true) {
                    if (session.score > realHigh) realHigh = session.score;
                }
            });
            student.allTimeHigh = realHigh > 0 ? realHigh : undefined;

            db[studentId] = student;
            saveStudentsDb(db);

            return {
                success: true,
                allTimeHigh: student.allTimeHigh,
                xp: student.xp || 0,
                level: student.level || 1,
                dailyStreak: student.dailyStreak || 0,
                factMastery: student.factMastery || {}
            };
        } catch (error) {
            console.error("Login failed:", error);
            return { success: false, message: "System Error: Could not save to device storage." };
        }
    } else {
        return fetchApi('loginAction', { studentId });
    }
}

export async function checkDailyStats(studentId: string) {
    if (isOffline) {
        if (!studentId) return { count: 0, allowed: true };
        const student = getStudent(studentId);
        if (!student) return { count: 0, allowed: true };

        const todayOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Chicago" };
        const today = new Date().toLocaleDateString("en-US", todayOptions);

        const todaySessions = student.sessions.filter(s =>
            new Date(s.timestamp).toLocaleDateString("en-US", todayOptions) === today
        );

        return { count: todaySessions.length, allowed: true };
    } else {
        return fetchApi('checkDailyStats', { studentId });
    }
}

export async function logSessionAction(
    studentId: string,
    score: number,
    total: number,
    gameType: string,
    wrong: number,
    isMultipleChoice: boolean,
    selectedFactors: string[],
    assessmentTier?: string,
    sessionMasteryUpdates?: Record<string, number>
) {
    if (isOffline) {
        const db = getStudentsDb();
        const now = new Date().toISOString();
        let student = db[studentId];
        
        if (!student) {
            student = {
                id: studentId, lastSeen: now, loginCount: 1, sessions: [],
                xp: 0, level: 1, dailyStreak: 0, lastStreakUpdate: "", factMastery: {}
            };
        }

        const newSession: Session = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: now, score, total, gameType, wrong, isMultipleChoice, selectedFactors, assessmentTier
        };

        student.sessions.push(newSession);

        if (gameType === "assessment") {
            const currentHigh = student.allTimeHigh || 0;
            if (score > currentHigh) student.allTimeHigh = score;
        }

        const sessionXP = (score * 10) + 50;
        student.xp = (student.xp || 0) + sessionXP;
        student.level = Math.floor(student.xp / 1000) + 1;

        const todayOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Chicago" };
        const todayDate = new Date().toLocaleDateString("en-CA", todayOptions);
        const yesterdayDate = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", todayOptions);

        const todaySessionsCount = student.sessions.filter(s => {
            return new Date(s.timestamp).toLocaleDateString("en-CA", todayOptions) === todayDate;
        }).length;

        let streakUpdated = false;

        if (todaySessionsCount >= 5) {
            if (student.lastStreakUpdate === yesterdayDate) {
                student.dailyStreak += 1;
                student.lastStreakUpdate = todayDate;
                streakUpdated = true;
            } else if (student.lastStreakUpdate !== todayDate) {
                student.dailyStreak = 1;
                student.lastStreakUpdate = todayDate;
                streakUpdated = true;
            }
        }

        if (sessionMasteryUpdates) {
            student.factMastery = { ...(student.factMastery || {}), ...sessionMasteryUpdates };
        }

        student.lastSeen = now;
        db[studentId] = student;
        saveStudentsDb(db);

        return {
            success: true,
            allTimeHigh: student.allTimeHigh,
            xpCaughtUp: sessionXP,
            currentLevel: student.level,
            dailyStreak: student.dailyStreak,
            streakUpdated
        };
    } else {
        return fetchApi('logSessionAction', {
            studentId, score, total, gameType, wrong, isMultipleChoice, selectedFactors, assessmentTier, sessionMasteryUpdates
        });
    }
}

export async function getDashboardData() {
    if (isOffline) {
        const db = getStudentsDb();
        const students = Object.values(db);
        return students.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    } else {
        return fetchApi('getDashboardData', {});
    }
}

export async function deleteStudentAction(studentId: string) {
    if (isOffline) {
        const db = getStudentsDb();
        if (db[studentId]) {
            delete db[studentId];
            saveStudentsDb(db);
            return { success: true };
        }
        return { success: false, message: "Student not found" };
    } else {
        return fetchApi('deleteStudentAction', { studentId });
    }
}

export async function getStudentAction(studentId: string) {
    if (isOffline) {
        const student = getStudent(studentId);
        return { success: !!student, student };
    } else {
        return fetchApi('getStudentAction', { studentId });
    }
}
