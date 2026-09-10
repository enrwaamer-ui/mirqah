const express = require("express");
const router = express.Router();
const db = require("../db");


// عرض امتحانات المواد الخاصة بالطالب
router.get("/", async (req, res) => {
    try {
        const { student_id } = req.query;

        const result = await db.query(
           ` SELECT 
                exams.id,
                exams.subject_id,
                subjects.name AS subject_name,
                exams.title,
                exams.exam_date,
                exams.start_time,
                exams.room,
                exams.description
             FROM public.exams
             JOIN public.subjects
             ON exams.subject_id = subjects.id
             JOIN public.enrollments
             ON exams.subject_id = enrollments.subject_id
             WHERE enrollments.student_id = $1
             AND enrollments.status = 'active'
             ORDER BY exams.exam_date, exams.start_time`,
            [student_id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});



// عرض امتحان واحد حسب ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            "SELECT * FROM public.exams WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Exam not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// إضافة امتحان جديد
router.post("/", async (req, res) => {
    try {
        const {
            subject_id,
            title,
            exam_date,
            start_time,
            room,
            description
        } = req.body;

        const result = await db.query(
           ` INSERT INTO public.exams
            (subject_id, title, exam_date, start_time, room, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                subject_id,
                title,
                exam_date,
                start_time,
                room,
                description
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// تعديل امتحان
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            subject_id,
            title,
            exam_date,
            start_time,
            room,
            description
        } = req.body;

        const result = await db.query(
           ` UPDATE public.exams
            SET subject_id = $1,
                title = $2,
                exam_date = $3,
                start_time = $4,
                room = $5,
                description = $6
            WHERE id = $7
            RETURNING *`,
            [
                subject_id,
                title,
                exam_date,
                start_time,
                room,
                description,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Exam not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// حذف امتحان
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            "DELETE FROM public.exams WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Exam not found"
            });
        }

        res.json({
            message: "Exam deleted successfully",
            exam: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;