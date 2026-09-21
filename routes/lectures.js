const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");


// ============================================
// عرض محاضرات الطالب الحالي
// GET /lectures
// ============================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                lectures.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             WHERE lectures.student_id = $1
             ORDER BY lectures.lecture_date, lectures.start_time`,
            [studentId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /lectures error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// المحاضرة القادمة للطالب الحالي
// GET /lectures/next
// ============================================
router.get("/next", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                lectures.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             WHERE lectures.student_id = $1
             AND (
                lectures.lecture_date + lectures.start_time
             ) >= NOW()
             ORDER BY
                lectures.lecture_date,
                lectures.start_time
             LIMIT 1`,
            [studentId]
        );

        if (result.rows.length === 0) {
            return res.json(null);
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /lectures/next error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// عرض محاضرة واحدة للطالب الحالي
// GET /lectures/:id
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                lectures.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             WHERE lectures.id = $1
             AND lectures.student_id = $2`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /lectures/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// إضافة محاضرة للطالب الحالي
// POST /lectures
// ============================================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall
        } = req.body;

        const studentId = req.user.id;

        if (
            !subject_id ||
            !title ||
            !lecture_date ||
            !start_time ||
            !end_time ||
            !hall
        ) {
            return res.status(400).json({
                error: "جميع بيانات المحاضرة مطلوبة"
            });
        }

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
                error: "لا يمكنك إضافة محاضرة لمادة غير مسجل فيها"
            });
        }

        const result = await db.query(
            `INSERT INTO public.lectures
            (
                student_id,
                subject_id,
                title,
                lecture_date,
                start_time,
                end_time,
                hall
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                studentId,
                subject_id,
                title,
                lecture_date,
                start_time,
                end_time,
                hall
            ]
        );

        res.status(201).json({
            message: "تمت إضافة المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("POST /lectures error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// تعديل محاضرة الطالب الحالي
// PUT /lectures/:id
// ============================================
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall
        } = req.body;

        const studentId = req.user.id;

        if (
            !subject_id ||
            !title ||
            !lecture_date ||
            !start_time ||
            !end_time ||
            !hall
        ) {
            return res.status(400).json({
                error: "جميع بيانات المحاضرة مطلوبة"
            });
        }

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
                error: "لا يمكنك ربط المحاضرة بمادة غير مسجل فيها"
            });
        }

        const result = await db.query(
            `UPDATE public.lectures
             SET
                subject_id = $1,
                title = $2,
                lecture_date = $3,
                start_time = $4,
                end_time = $5,
                hall = $6
             WHERE id = $7
             AND student_id = $8
             RETURNING *`,
            [
                subject_id,
                title,
                lecture_date,
                start_time,
                end_time,
                hall,
                id,
                studentId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة أو لا تخص حسابك"
            });
        }

        res.json({
            message: "تم تعديل المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /lectures/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// حذف محاضرة الطالب الحالي
// DELETE /lectures/:id
// ============================================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `DELETE FROM public.lectures
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة أو لا تخص حسابك"
            });
        }

        res.json({
            message: "تم حذف المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /lectures/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
