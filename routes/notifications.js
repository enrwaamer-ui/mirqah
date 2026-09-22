
const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");


// =====================================================
// جلب إشعارات الطالب الحالي فقط
// =====================================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                notifications.id,
                notifications.student_id,
                notifications.title,
                notifications.message,
                notifications.is_read,
                notifications.created_at,
                notifications.lecture_id,
                lectures.title AS lecture_title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall
             FROM public.notifications
             LEFT JOIN public.lectures
                ON notifications.lecture_id = lectures.id
             WHERE notifications.student_id = $1
             ORDER BY notifications.created_at DESC`,
            [studentId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /notifications error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =====================================================
// عدد الإشعارات غير المقروءة للطالب الحالي فقط
// =====================================================
router.get("/unread-count", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT COUNT(*) AS count
             FROM public.notifications
             WHERE student_id = $1
             AND is_read = false`,
            [studentId]
        );

        res.json({
            count: Number(result.rows[0].count)
        });

    } catch (error) {
        console.error(
            "GET /notifications/unread-count error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =====================================================
// تعليم إشعار واحد كمقروء
// =====================================================
router.put("/:id/read", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `UPDATE public.notifications
             SET is_read = true
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الإشعار غير موجود أو لا يخص حسابك"
            });
        }

        res.json({
            message: "تم تعليم الإشعار كمقروء",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error(
            "PUT /notifications/:id/read error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =====================================================
// تعليم كل إشعارات الطالب الحالي كمقروءة
// =====================================================
router.put("/read-all", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `UPDATE public.notifications
             SET is_read = true
             WHERE student_id = $1
             AND is_read = false
             RETURNING id`,
            [studentId]
        );

        res.json({
            message: "تم تعليم كل الإشعارات كمقروءة",
            updated: result.rows.length
        });

    } catch (error) {
        console.error(
            "PUT /notifications/read-all error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =====================================================
// حذف إشعار للطالب الحالي فقط
// =====================================================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `DELETE FROM public.notifications
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الإشعار غير موجود أو لا يخص حسابك"
            });
        }

        res.json({
            message: "تم حذف الإشعار",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error(
            "DELETE /notifications/:id error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =====================================================
// تصدير الراوتر
// =====================================================
module.exports = router;
