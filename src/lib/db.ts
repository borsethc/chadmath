import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

const DB_PATH = path.join(process.cwd(), 'data.json');

// --- DATABASE TYPES ---
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
        const student: Student = existing || {
            id: studentId,
            lastSeen: now,
            sessions: []
        };
        student.lastSeen = now;

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
                sessions: []
            };
        } else {
            db.students[studentId].lastSeen = now;
        }
        await writeDbFile(db);
        return db.students[studentId];
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
                sessions: [newSession]
            };
            await pool.query(`
                INSERT INTO students (id, data) VALUES ($1, $2)
            `, [studentId, JSON.stringify(newStudent)]);
            return newSession;
        }

        student.sessions.push(newSession);
        student.lastSeen = now;

        await pool.query('UPDATE students SET data = $2 WHERE id = $1', [studentId, JSON.stringify(student)]);
    } else {
        // Local File
        const db = await readDbFile();
        if (!db.students[studentId]) {
            db.students[studentId] = {
                id: studentId,
                lastSeen: now,
                sessions: []
            };
        }
        db.students[studentId].sessions.push(newSession);
        db.students[studentId].lastSeen = now;
        await writeDbFile(db);
    }

    return newSession;
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
