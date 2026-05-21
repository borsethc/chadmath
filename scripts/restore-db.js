const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

async function restoreDatabase() {
    console.log("=========================================");
    console.log("CHADMATH DATABASE RESTORATION UTILITY");
    console.log("=========================================");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ ERROR: DATABASE_URL environment variable is not defined!");
        console.error("Please provide it when running the script, e.g.:");
        console.error("DATABASE_URL=postgresql://... node scripts/restore-db.js");
        process.exit(1);
    }

    console.log("ℹ️ Reading local student data from data.json...");
    let data;
    try {
        const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
        data = JSON.parse(fileContent);
    } catch (e) {
        console.error("❌ ERROR: Failed to read or parse data.json!");
        console.error(e.message);
        process.exit(1);
    }

    const students = data.students || {};
    const studentKeys = Object.keys(students);
    const totalStudents = studentKeys.length;

    console.log(`ℹ️ Found ${totalStudents} students in data.json.`);
    if (totalStudents === 0) {
        console.log("✅ Nothing to import. Exiting.");
        process.exit(0);
    }

    console.log("ℹ️ Connecting to Postgres database...");
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Railway
    });

    try {
        await client.connect();
        console.log("✅ Database connection established.");

        console.log("ℹ️ Ensuring 'students' table exists...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
        console.log("✅ Table structure verified.");

        console.log("ℹ️ Beginning restoration...");
        let importedCount = 0;
        let failedCount = 0;

        for (const studentId of studentKeys) {
            const studentData = students[studentId];
            
            try {
                // Upsert student record
                await client.query(`
                    INSERT INTO students (id, data) 
                    VALUES ($1, $2) 
                    ON CONFLICT (id) 
                    DO UPDATE SET data = $2
                `, [studentId, JSON.stringify(studentData)]);

                console.log(`   👉 Imported: ${studentId}`);
                importedCount++;
            } catch (err) {
                console.error(`   ❌ Failed to import ${studentId}:`, err.message);
                failedCount++;
            }
        }

        console.log("=========================================");
        console.log("RESTORATION SUMMARY");
        console.log("=========================================");
        console.log(`🎉 Successful Imports: ${importedCount}/${totalStudents}`);
        if (failedCount > 0) {
            console.log(`⚠️ Failed Imports:     ${failedCount}/${totalStudents}`);
        }
        console.log("✅ Migration complete.");

    } catch (e) {
        console.error("❌ DATABASE CONNECTION ERROR:", e.message);
    } finally {
        await client.end();
        console.log("ℹ️ Connection closed.");
    }
}

restoreDatabase();
