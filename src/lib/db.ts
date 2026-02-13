import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

const DB_PATH = path.join(process.cwd(), 'data.json');

// --- DATABASE TYPES ---
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
};

export type Database = {
    students: Record<string, Student>;
};

// --- POSTGRES CLIENT ---
// Only connect if DATABASE_URL is provided (Production/Railway)
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Railway
    })
    : null;

// --- INITIALIZATION ---
const initDb = async () => {
    if (pool) {
        // Create table if not exists (Postgres)
        // We store the entire Student object as JSONB for simplicity to match current structure
        await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
    } else {
        // File System Fallback
        try {
            await fs.access(DB_PATH);
        } catch {
            await fs.writeFile(DB_PATH, JSON.stringify({ students: {} }, null, 2));
        }
    }
};

// --- DATA ACCESS ---

export const getStudent = async (studentId: string): Promise<Student | null> => {
    await initDb(); // Ensure init

    if (pool) {
        const res = await pool.query('SELECT data FROM students WHERE id = $1', [studentId]);
        return res.rows[0]?.data || null;
    } else {
        const db = await readDbFile();
        return db.students[studentId] || null;
    }
};

export const createOrUpdateStudent = async (studentId: string): Promise<Student> => {
    await initDb();
    const now = new Date().toISOString();

    if (pool) {
        // Postgres: Upsert logic
        // Get existing or create new
        const existing = await getStudent(studentId);

        // If existing, increment loginCount. If new, set to 1.
        // Fallback for existing records without loginCount: usage of sessions length or 1
        const currentLogins = existing?.loginCount ?? (existing ? (existing.sessions?.length || 1) : 0);

        const student: Student = existing ? {
            ...existing,
            lastSeen: now,
            loginCount: currentLogins + 1
        } : {
            id: studentId,
            lastSeen: now,
            loginCount: 1,
            sessions: [],
            xp: 0,
            level: 1,
            dailyStreak: 0,
            lastStreakUpdate: ""
        };

        await pool.query(`
            INSERT INTO students (id, data) 
            VALUES ($1, $2) 
            ON CONFLICT (id) 
            DO UPDATE SET data = $2
        `, [studentId, JSON.stringify(student)]);

        return student;
    } else {
        // Local File
        const db = await readDbFile();
        if (!db.students[studentId]) {
            db.students[studentId] = {
                id: studentId,
                lastSeen: now,
                loginCount: 1,
                sessions: [],
                xp: 0,
                level: 1,
                dailyStreak: 0,
                lastStreakUpdate: ""
            };
        } else {
            db.students[studentId].lastSeen = now;
            // Increment logic for local file too
            const currentLogins = db.students[studentId].loginCount ?? db.students[studentId].sessions.length ?? 0;
            db.students[studentId].loginCount = currentLogins + 1;
        }
        await writeDbFile(db);
        return db.students[studentId];
    }
};

export const getAllStudents = async (): Promise<Student[]> => {
    await initDb();

    if (pool) {
        const res = await pool.query('SELECT data FROM students');
        return res.rows.map(row => row.data);
    } else {
        const db = await readDbFile();
        return Object.values(db.students);
    }
};

export const addSession = async (studentId: string, session: Omit<Session, "id" | "timestamp">) => {
    await initDb();
    const now = new Date().toISOString();

    // Create new session object
    const newSession: Session = {
        ...session,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: now,
    };

    let newAllTimeHigh: number | undefined;

    if (pool) {
        // Postgres: Read -> Modify -> Write
        const student = await getStudent(studentId);
        if (!student) {
            // Should exist if logged in, but handle safely
            await createOrUpdateStudent(studentId);
            // Recursive call to try again or just proceed?
            // Let's just create it.
            const newStudent: Student = {
                id: studentId,
                lastSeen: now,
                loginCount: 1, // Default for implicit creation via session add? 
                // Actually addSession is usually called AFTER login, so user should exist.
                // But if strictly new here:
                sessions: [newSession],
                xp: 0,
                level: 1,
                dailyStreak: 0,
                lastStreakUpdate: ""
            };
            await pool.query(`
                INSERT INTO students (id, data) VALUES ($1, $2)
            `, [studentId, JSON.stringify(newStudent)]);
            return newSession;
        }

        student.sessions.push(newSession);

        // Update All Time High if Assessment
        if (session.gameType === "assessment") {
            const currentHigh = student.allTimeHigh || 0;
            if (session.score > currentHigh) {
                student.allTimeHigh = session.score;
                newAllTimeHigh = session.score;
            }
        }

        student.lastSeen = now;

        await pool.query('UPDATE students SET data = $2 WHERE id = $1', [studentId, JSON.stringify(student)]);
    } else {
        // Local File
        const db = await readDbFile();
        if (!db.students[studentId]) {
            db.students[studentId] = {
                id: studentId,
                lastSeen: now,
                loginCount: 1,
                sessions: [],
                xp: 0,
                level: 1,
                dailyStreak: 0,
                lastStreakUpdate: ""
            };
        }
        db.students[studentId].sessions.push(newSession);

        // Update All Time High if Assessment
        if (session.gameType === "assessment") {
            const currentHigh = db.students[studentId].allTimeHigh || 0;
            if (session.score > currentHigh) {
                db.students[studentId].allTimeHigh = session.score;
                newAllTimeHigh = session.score;
            }
        }

        db.students[studentId].lastSeen = now;
        await writeDbFile(db);
    }

    return newSession;
};

export const updateStudentProgress = async (studentId: string, xp: number, level: number, dailyStreak?: number, lastStreakUpdate?: string) => {
    await initDb();

    if (pool) {
        const student = await getStudent(studentId);
        if (student) {
            student.xp = xp;
            student.level = level;
            if (dailyStreak !== undefined) student.dailyStreak = dailyStreak;
            if (lastStreakUpdate !== undefined) student.lastStreakUpdate = lastStreakUpdate;
            await pool.query('UPDATE students SET data = $2 WHERE id = $1', [studentId, JSON.stringify(student)]);
        }
    } else {
        const db = await readDbFile();
        if (db.students[studentId]) {
            db.students[studentId].xp = xp;
            db.students[studentId].level = level;
            if (dailyStreak !== undefined) db.students[studentId].dailyStreak = dailyStreak;
            if (lastStreakUpdate !== undefined) db.students[studentId].lastStreakUpdate = lastStreakUpdate;
            await writeDbFile(db);
        }
    }
};

// --- FILE SYSTEM HELPERS (Private) ---
const readDbFile = async (): Promise<Database> => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { students: {} };
    }
};

const writeDbFile = async (data: Database) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
};

export const checkConnection = async (): Promise<{
    status: 'connected' | 'error' | 'n/a';
    mode: 'postgres' | 'filesystem';
    message?: string;
}> => {
    if (pool) {
        try {
            await pool.query('SELECT 1');
            return { status: 'connected', mode: 'postgres' };
        } catch (e) {
            return { status: 'error', mode: 'postgres', message: (e as Error).message };
        }
    } else {
        return { status: 'n/a', mode: 'filesystem', message: 'Using local file system' };
    }
};
