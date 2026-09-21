const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");


// =========================
// جلب مواد الطالب المسجل فيها
// =========================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                enrollments.subject_id,
                enrollments.status,
                enrollments.created_at,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.enrollments
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE enrollments.student_id = $1
             ORDER BY subjects.name`,
            [studentId]
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
// جلب تسجيل واحد
// =========================
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                enrollments.subject_id,
                enrollments.status,
                enrollments.created_at,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.enrollments
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE enrollments.id = $1
             AND enrollments.student_id = $2`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "التسجيل غير موجود أو لا يخص حسابك"
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
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { subject_id } = req.body;
        const studentId = req.user.id;

        if (!subject_id) {
            return res.status(400).json({
                error: "رقم المادة مطلوب"
            });
        }

        const subject = await db.query(
            `SELECT id, name, code
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        const existing = await db.query(
            `SELECT id, status
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2`,
            [studentId, subject_id]
        );

        if (existing.rows.length > 0) {

            if (existing.rows[0].status === "active") {
                return res.status(400).json({
                    error: "أنت مسجل في هذه المادة بالفعل"
                });
            }

            const restored = await db.query(
                `UPDATE public.enrollments
                 SET status = 'active'
                 WHERE id = $1
                 RETURNING *`,
                [existing.rows[0].id]
            );

            return res.status(201).json({
                message: "تمت إعادة تسجيل المادة بنجاح",
                enrollment: restored.rows[0]
            });
        }

        const result = await db.query(
            `INSERT INTO public.enrollments
            (
                student_id,
                subject_id,
                status
            )
            VALUES ($1, $2, 'active')
            RETURNING *`,
            [studentId, subject_id]
        );

        res.status(201).json({
            message: "تم التسجيل في المادة بنجاح",
            enrollment: result.rows[0]
        });

    } catch (error) {
        console.error("POST /enrollments error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// إلغاء تسجيل الطالب من مادة
// =========================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `UPDATE public.enrollments
             SET status = 'inactive'
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "التسجيل غير موجود أو لا يخص حسابك"
            });
        }

        res.json({
            message: "تم إلغاء التسجيل من المادة",
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
