
const express = require("express");
const router = express.Router();
const db = require("../db");

// =========================
// عرض مواد طالب معيّن
// =========================
router.get("/", async (req, res) => {
    try {
        const { student_id } = req.query;

        if (!student_id) {
            return res.status(400).json({
                error: "student_id مطلوب"
            });
        }

        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                enrollments.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code,
                enrollments.lecture_id,
                enrollments.status,
                enrollments.created_at
             FROM public.enrollments
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE enrollments.student_id = $1
             ORDER BY subjects.name`,
            [student_id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /enrollments error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// عرض تسجيل واحد لطالب معيّن
// =========================
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id } = req.query;

        if (!student_id) {
            return res.status(400).json({
                error: "student_id مطلوب"
            });
        }

        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                enrollments.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code,
                enrollments.lecture_id,
                enrollments.status,
                enrollments.created_at
             FROM public.enrollments
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE enrollments.id = $1
             AND enrollments.student_id = $2`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "التسجيل غير موجود أو لا يخص هذا الطالب"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /enrollments/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// تسجيل الطالب في مادة
// =========================
router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            status
        } = req.body;

        if (!student_id || !subject_id) {
            return res.status(400).json({
                error: "الطالب والمادة مطلوبان"
            });
        }

        // التأكد من وجود الطالب
        const student = await db.query(
            `SELECT id
             FROM public.students
             WHERE id = $1`,
            [student_id]
        );

        if (student.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        // التأكد من وجود المادة
        const subject = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        // منع التكرار
        const existing = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2`,
            [student_id, subject_id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: "أنت مسجل في هذه المادة بالفعل"
            });
        }

        const result = await db.query(
            `INSERT INTO public.enrollments
            (
                student_id,
                subject_id,
                status
            )
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                student_id,
                subject_id,
                status || "active"
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("POST /enrollments error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// تعديل تسجيل الطالب
// =========================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            student_id,
            subject_id,
            status
        } = req.body;

        if (!student_id || !subject_id) {
            return res.status(400).json({
                error: "الطالب والمادة مطلوبان"
            });
        }

        // التأكد أن التسجيل يخص هذا الطالب
        const existing = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE id = $1
             AND student_id = $2`,
            [id, student_id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: "التسجيل غير موجود أو لا يخص هذا الطالب"
            });
        }

        // التأكد من وجود المادة
        const subject = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        const result = await db.query(
            `UPDATE public.enrollments
             SET
                subject_id = $1,
                status = $2
             WHERE id = $3
             AND student_id = $4
             RETURNING *`,
            [
                subject_id,
                status || "active",
                id,
                student_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "التسجيل غير موجود"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("PUT /enrollments/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// حذف تسجيل الطالب من مادة
// =========================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id } = req.query;

        if (!student_id) {
            return res.status(400).json({
                error: "student_id مطلوب"
            });
        }

        const result = await db.query(
            `DELETE FROM public.enrollments
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "التسجيل غير موجود أو لا يخص هذا الطالب"
            });
        }

        res.json({
            message: "تم حذف المادة من موادك",
            enrollment: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /enrollments/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
