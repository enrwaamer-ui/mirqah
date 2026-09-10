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


// Routes
app.use("/students", studentsRouter);
app.use("/subjects", subjectsRouter);
app.use("/lectures", lecturesRouter);
app.use("/enrollments", enrollmentsRouter);
app.use("/exams", examsRouter);
app.use("/notifications", notificationsRouter);

// الصفحة الرئيسية
app.get("/", function (req, res) {
    res.send("Welcome to Mirqah");
});


// تشغيل السيرفر
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", function () {
    console.log(`Mirqah is running on port ${PORT}`);
});