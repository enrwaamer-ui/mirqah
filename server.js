const express = require("express");
const db = require("./db");

const studentsRouter = require("./routes/students");
const subjectsRouter = require("./routes/subjects");
const lecturesRouter = require("./routes/lectures");
const enrollmentsRouter = require("./routes/enrollments");
const examsRouter = require("./routes/exams");
const notificationsRouter = require("./routes/notifications");

require("./notificationsScheduler");

const app = express();

app.use(express.json());
app.use(express.static("public"));

async function initDb() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        `);

        await db.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS major VARCHAR(255);
        `);

        await db.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS university VARCHAR(255);
        `);

        await db.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS academic_year VARCHAR(100);
        `);

        await db.query(`
            ALTER TABLE students
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';
        `);

        await db.query(`
            UPDATE students
            SET role = 'student'
            WHERE role IS NULL;
        `);

        await db.query(`
            ALTER TABLE lectures
            ADD COLUMN IF NOT EXISTS student_id INTEGER;
        `);

        await db.query(`
            ALTER TABLE exams
            ADD COLUMN IF NOT EXISTS student_id INTEGER;
        `);

        await db.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'lectures_student_id_fkey'
                ) THEN
                    ALTER TABLE lectures
                    ADD CONSTRAINT lectures_student_id_fkey
                    FOREIGN KEY (student_id)
                    REFERENCES students(id)
                    ON DELETE CASCADE;
                END IF;
            END
            $$;
        `);

        await db.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'exams_student_id_fkey'
                ) THEN
                    ALTER TABLE exams
                    ADD CONSTRAINT exams_student_id_fkey
                    FOREIGN KEY (student_id)
                    REFERENCES students(id)
                    ON DELETE CASCADE;
                END IF;
            END
            $$;
        `);

        console.log("Database tables initialized successfully!");
        console.log("Personal student data structure is ready!");
    } catch (err) {
        console.error("Error initializing database tables:", err);
    }
}

initDb();

app.use("/students", studentsRouter);
app.use("/subjects", subjectsRouter);
app.use("/lectures", lecturesRouter);
app.use("/enrollments", enrollmentsRouter);
app.use("/exams", examsRouter);
app.use("/notifications", notificationsRouter);

app.get("/", function (req, res) {
    res.send("Welcome to Mirqah");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", function () {
    console.log(`Mirqah is running on port ${PORT}`);
});
