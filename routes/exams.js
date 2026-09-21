const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");


// =========================
// جلب كل امتحانات الطالب
// =========================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                exams.id,
                exams.subject_name,
                exams.exam_date,
                exams.start_time,
                exams.hall,
                exams.subject_id,
                subjects.name AS subject_display_name,
                subjects.code AS subject_code
             FROM public.exams
             LEFT JOIN public.subjects
                ON exams.subject_id = subjects.id
             WHERE exams.student_id = $1
             ORDER BY exams.exam_date, exams.start_time`,
            [studentId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /exams error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// جلب امتحان واحد
// =========================
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                exams.id,
                exams.subject_name,
                exams.exam_date,
                exams.start_time,
                exams.hall,
                exams.subject_id,
                subjects.name AS subject_display_name,
                subjects.code AS subject_code
             FROM public.exams
             LEFT JOIN public.subjects
                ON exams.subject_id = subjects.id
             WHERE exams.id = $1
             AND exams.student_id = $2`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الامتحان غير موجود أو لا يخص حسابك"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /exams/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// إضافة امتحان
// =========================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            subject_id,
            subject_name,
            exam_date,
            start_time,
            hall
        } = req.body;

        const studentId = req.user.id;

        if (!subject_id || !subject_name || !exam_date || !start_time || !hall) {
            return res.status(400).json({
                error: "جميع بيانات الامتحان مطلوبة"
            });
        }

        // نتأكد إن المادة تخص الطالب
        const enrollment = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             AND status = 'active'`,
            [studentId, subject_id]
        );

        if (enrollment.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك إضافة امتحان لمادة غير مسجل فيها"
            });
        }

        const result = await db.query(
            `INSERT INTO public.exams
            (
                student_id,
                subject_id,
                subject_name,
                exam_date,
                start_time,
                hall
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                studentId,
                subject_id,
                subject_name,
                exam_date,
                start_time,
                hall
            ]
        );

        res.status(201).json({
            message: "تمت إضافة الامتحان بنجاح",
            exam: result.rows[0]
        });

    } catch (error) {
        console.error("POST /exams error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// تعديل امتحان
// =========================
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            subject_id,
            subject_name,
            exam_date,
            start_time,
            hall
        } = req.body;

        const studentId = req.user.id;

        if (!subject_id || !subject_name || !exam_date || !start_time || !hall) {
            return res.status(400).json({
                error: "جميع بيانات الامتحان مطلوبة"
            });
        }

        // نتأكد إن المادة تخص الطالب
        const enrollment = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             AND status = 'active'`,
            [studentId, subject_id]
        );

        if (enrollment.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك ربط الامتحان بمادة غير مسجل فيها"
            });
        }

        const result = await db.query(
            `UPDATE public.exams
             SET
                subject_id = $1,
                subject_name = $2,
                exam_date = $3,
                start_time = $4,
                hall = $5
             WHERE id = $6
             AND student_id = $7
             RETURNING *`,
            [
                subject_id,
                subject_name,
                exam_date,
                start_time,
                hall,
                id,
                studentId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الامتحان غير موجود أو لا يخص حسابك"
            });
        }

        res.json({
            message: "تم تعديل الامتحان بنجاح",
            exam: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /exams/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =========================
// حذف امتحان
// =========================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `DELETE FROM public.exams
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الامتحان غير موجود أو لا يخص حسابك"
            });
        }

        res.json({
            message: "تم حذف الامتحان بنجاح",
            exam: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /exams/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
