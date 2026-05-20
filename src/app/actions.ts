// Client-side actions using localStorage instead of a database

// Define the Session and Student types matching the old DB types
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
    lastStreakUpdate: string; // ISO date string YYYY-MM-DD
    factMastery: Record<string, number>;
};

// Helper to get all students from local storage
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

export async function loginAction(studentId: string) {
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
                id: studentId,
                lastSeen: now,
                loginCount: 1,
                sessions: [],
                xp: 0,
                level: 1,
                dailyStreak: 0,
                lastStreakUpdate: "",
                factMastery: {}
            };
        }

        // Sanitize legacy scores just like old code
        let realHigh = 0;
        student.sessions?.forEach(session => {
            if (session.gameType === "assessment" && session.isMultipleChoice !== true) {
                if (session.score > realHigh) {
                    realHigh = session.score;
                }
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
}

export async function checkDailyStats(studentId: string) {
    if (!studentId) return { count: 0, allowed: true };
    const student = getStudent(studentId);
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
    assessmentTier?: string,
    sessionMasteryUpdates?: Record<string, number>
) {
    const db = getStudentsDb();
    const now = new Date().toISOString();
    
    let student = db[studentId];
    if (!student) {
        student = {
            id: studentId,
            lastSeen: now,
            loginCount: 1,
            sessions: [],
            xp: 0,
            level: 1,
            dailyStreak: 0,
            lastStreakUpdate: "",
            factMastery: {}
        };
    }

    const newSession: Session = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: now,
        score,
        total,
        gameType,
        wrong,
        isMultipleChoice,
        selectedFactors,
        assessmentTier
    };

    student.sessions.push(newSession);

    // Update All Time High
    if (gameType === "assessment") {
        const currentHigh = student.allTimeHigh || 0;
        if (score > currentHigh) {
            student.allTimeHigh = score;
        }
    }

    // Calculate XP
    const sessionXP = (score * 10) + 50;
    student.xp = (student.xp || 0) + sessionXP;
    student.level = Math.floor(student.xp / 1000) + 1;

    // Daily Streak Logic
    const todayOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Chicago" };
    const todayDate = new Date().toLocaleDateString("en-CA", todayOptions);
    const yesterdayDate = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", todayOptions);

    const todaySessionsCount = student.sessions.filter(s => {
        return new Date(s.timestamp).toLocaleDateString("en-CA", todayOptions) === todayDate;
    }).length;

    let streakUpdated = false;

    if (todaySessionsCount >= 5) {
        if (student.lastStreakUpdate === todayDate) {
            // Already credited
        } else if (student.lastStreakUpdate === yesterdayDate) {
            student.dailyStreak += 1;
            student.lastStreakUpdate = todayDate;
            streakUpdated = true;
        } else {
            student.dailyStreak = 1;
            student.lastStreakUpdate = todayDate;
            streakUpdated = true;
        }
    }

    // Update Fact Mastery
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
}
