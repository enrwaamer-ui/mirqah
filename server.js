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

// دالة إنشاء الجداول تلقائياً إن لم تكن موجودة
async function initDb() {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database tables initialized successfully!");
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
}

// استدعاء إنشاء الجداول
initDb();

// Routes
app.use("/students", studentsRouter);
app.use("/subjects", subjectsRouter);
app.use("/lectures", lecturesRouter);
app.use("/enrollments", enrollmentsRouter);
app.use("/exams", examsRouter);
app.use("/notifications", notificationsRouter);

// الصفحة الرئيسية //
app.get("/", function (req, res) {
  res.send("Welcome to Mirqah");
});

// تشغيل السيرفر //
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", function () {
  console.log(`Mirqah is running on port ${PORT}`);
});