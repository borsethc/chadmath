import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.json');

export type Session = {
    id: string;
    timestamp: string;
    score: number;
    total: number;
    gameType: string;
};

export type Student = {
    id: string;
    lastSeen: string;
    sessions: Session[];
};

export type Database = {
    students: Record<string, Student>;
};

// Initialize DB if it doesn't exist
const initDb = async () => {
    try {
        await fs.access(DB_PATH);
    } catch {
        await fs.writeFile(DB_PATH, JSON.stringify({ students: {} }, null, 2));
    }
};

export const readDb = async (): Promise<Database> => {
    await initDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        // If file is corrupted, return empty db
        return { students: {} };
    }
};

export const writeDb = async (data: Database) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
};

export const getStudent = async (studentId: string): Promise<Student | null> => {
    const db = await readDb();
    return db.students[studentId] || null;
};

export const createOrUpdateStudent = async (studentId: string): Promise<Student> => {
    const db = await readDb();
    const now = new Date().toISOString();

    if (!db.students[studentId]) {
        db.students[studentId] = {
            id: studentId,
            lastSeen: now,
            sessions: []
        };
    } else {
        db.students[studentId].lastSeen = now;
    }

    await writeDb(db);
    return db.students[studentId];
};

export const addSession = async (studentId: string, session: Omit<Session, "id" | "timestamp">) => {
    const db = await readDb();
    if (!db.students[studentId]) {
        // Should not happen if logged in, but safety check
        await createOrUpdateStudent(studentId);
        // Re-read to ensure we have the latest reference in 'db' object if we want to be safe, 
        // but simpler to just modify the object we have if we know the structure.
        // Actually createOrUpdateStudent reads/writes, so 'db' here is stale.
        // Let's simplified: just ensure existence.
        db.students[studentId] = {
            id: studentId,
            lastSeen: new Date().toISOString(),
            sessions: []
        };
    }

    const newSession: Session = {
        ...session,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
    };

    db.students[studentId].sessions.push(newSession);
    db.students[studentId].lastSeen = new Date().toISOString();

    await writeDb(db);
    return newSession;
};
