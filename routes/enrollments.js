const express = require("express");
const router = express.Router();
const db = require("../db");

// =========================
// عرض كل التسجيلات
// =========================
router.get("/", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                students.name AS student_name,
                students.email AS student_email,
                enrollments.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code,
                enrollments.lecture_id,
                enrollments.status,
                enrollments.created_at
             FROM public.enrollments
             JOIN public.students
                ON enrollments.student_id = students.id
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             ORDER BY students.name, subjects.name`
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
// عرض تسجيل واحد
// =========================
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                students.name AS student_name,
                enrollments.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code,
                enrollments.lecture_id,
                enrollments.status,
                enrollments.created_at
             FROM public.enrollments
             JOIN public.students
                ON enrollments.student_id = students.id
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE enrollments.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Enrollment not found"
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
// إضافة تسجيل طالب في مادة
// =========================
router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            lecture_id,
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

        // منع تسجيل نفس الطالب في نفس المادة مرتين
        const existing = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2`,
            [student_id, subject_id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: "الطالب مسجل في هذه المادة بالفعل"
            });
        }

        let result;

        // إذا تم اختيار محاضرة
        if (lecture_id) {
            const lecture = await db.query(
                `SELECT id
                 FROM public.lectures
                 WHERE id = $1`,
                [lecture_id]
            );

            if (lecture.rows.length === 0) {
                return res.status(404).json({
                    error: "المحاضرة غير موجودة"
                });
            }

            result = await db.query(
                `INSERT INTO public.enrollments
                (
                    student_id,
                    lecture_id,
                    subject_id,
                    status
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [
                    student_id,
                    lecture_id,
                    subject_id,
                    status || "active"
                ]
            );

        } else {
            // التسجيل في المادة بدون تحديد محاضرة
            result = await db.query(
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
        }

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("POST /enrollments error:", error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// تعديل تسجيل
// =========================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            student_id,
            subject_id,
            lecture_id,
            status
        } = req.body;

        if (!student_id || !subject_id) {
            return res.status(400).json({
                error: "الطالب والمادة مطلوبان"
            });
        }

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
                student_id = $1,
                lecture_id = $2,
                subject_id = $3,
                status = $4
             WHERE id = $5
             RETURNING *`,
            [
                student_id,
                lecture_id || null,
                subject_id,
                status || "active",
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Enrollment not found"
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
// حذف تسجيل
// =========================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM public.enrollments
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Enrollment not found"
            });
        }

        res.json({
            message: "Enrollment deleted successfully",
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
