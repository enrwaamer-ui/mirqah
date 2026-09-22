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
        // =========================
        // STUDENTS
        // =========================
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

        // =========================
        // SUBJECTS
        // =========================
        await db.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // يسمح للطالب بامتلاك مواد خاصة به.
        // إذا كانت NULL فهي مادة عامة/تابعة للإدارة.
        await db.query(`
            ALTER TABLE subjects
            ADD COLUMN IF NOT EXISTS student_id INTEGER;
        `);

        // =========================
        // LECTURES
        // =========================
        await db.query(`
            CREATE TABLE IF NOT EXISTS lectures (
                id SERIAL PRIMARY KEY,
                subject_name VARCHAR(255),
                instructor VARCHAR(255),
                hall VARCHAR(255),
                lecture_date DATE,
                start_time TIME,
                end_time TIME,
                subject_id INTEGER,
                time VARCHAR(100),
                date VARCHAR(100),
                lecture_time VARCHAR(100),
                title VARCHAR(255),
                student_id INTEGER
            );
        `);

        await db.query(`
            ALTER TABLE lectures
            ADD COLUMN IF NOT EXISTS student_id INTEGER;
        `);

        // =========================
        // EXAMS
        // =========================
        await db.query(`
            CREATE TABLE IF NOT EXISTS exams (
                id SERIAL PRIMARY KEY,
                subject_name VARCHAR(255),
                exam_date DATE,
                start_time TIME,
                hall VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                subject_id INTEGER,
                student_id INTEGER
            );
        `);

        await db.query(`
            ALTER TABLE exams
            ADD COLUMN IF NOT EXISTS student_id INTEGER;
        `);

        // =========================
        // ENROLLMENTS
        // =========================
        await db.query(`
            CREATE TABLE IF NOT EXISTS enrollments (
                id SERIAL PRIMARY KEY,
                student_id INTEGER,
                lecture_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                subject_id INTEGER,
                status VARCHAR(50) DEFAULT 'active'
            );
        `);

        await db.query(`
            ALTER TABLE enrollments
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        `);

        // =========================
        // NOTIFICATIONS
        // =========================
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                student_id INTEGER,
                title VARCHAR(255),
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                lecture_id INTEGER,
                notification_time TIMESTAMP
            );
        `);

        // العمود الذي سبب الخطأ عندك
        await db.query(`
            ALTER TABLE notifications
            ADD COLUMN IF NOT EXISTS lecture_id INTEGER;
        `);

        await db.query(`
            ALTER TABLE notifications
            ADD COLUMN IF NOT EXISTS notification_time TIMESTAMP;
        `);

        // =========================
        // FOREIGN KEYS
        // =========================

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

        await db.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'subjects_student_id_fkey'
                ) THEN
                    ALTER TABLE subjects
                    ADD CONSTRAINT subjects_student_id_fkey
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
                    WHERE conname = 'notifications_student_id_fkey'
                ) THEN
                    ALTER TABLE notifications
                    ADD CONSTRAINT notifications_student_id_fkey
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
                    WHERE conname = 'notifications_lecture_id_fkey'
                ) THEN
                    ALTER TABLE notifications
                    ADD CONSTRAINT notifications_lecture_id_fkey
                    FOREIGN KEY (lecture_id)
                    REFERENCES lectures(id)
                    ON DELETE CASCADE;
                END IF;
            END
            $$;
        `);

        console.log("======================================");
        console.log("Database initialization completed!");
        console.log("Students table ready.");
        console.log("Subjects table ready.");
        console.log("Lectures table ready.");
        console.log("Exams table ready.");
        console.log("Enrollments table ready.");
        console.log("Notifications table ready.");
        console.log("Personal student data structure ready.");
        console.log("======================================");

    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

initDb();

// =========================
// ROUTES
// =========================

app.use("/students", studentsRouter);
app.use("/subjects", subjectsRouter);
app.use("/lectures", lecturesRouter);
app.use("/enrollments", enrollmentsRouter);
app.use("/exams", examsRouter);
app.use("/notifications", notificationsRouter);

// =========================
// HOME
// =========================

app.get("/", function (req, res) {
    res.send("Welcome to Mirqah");
});

// =========================
// SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", function () {
    console.log(`Mirqah is running on port ${PORT}`);
});
