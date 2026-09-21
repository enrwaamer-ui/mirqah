const express = require("express");
const router = express.Router();
const db = require("../db");


// ==========================================
// جلب إشعارات الطالب
// ==========================================

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
                id,
                student_id,
                title,
                message,
                is_read,
                created_at,
                created_at AS notification_time
             FROM public.notifications
             WHERE student_id = $1
             ORDER BY created_at DESC`,
            [student_id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /notifications error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// عدد الإشعارات غير المقروءة
// ==========================================

router.get("/count", async (req, res) => {
    try {
        const { student_id } = req.query;

        if (!student_id) {
            return res.status(400).json({
                error: "student_id مطلوب"
            });
        }

        const result = await db.query(
            `SELECT COUNT(*) AS count
             FROM public.notifications
             WHERE student_id = $1
             AND is_read = false`,
            [student_id]
        );

        res.json({
            count: Number(result.rows[0].count)
        });

    } catch (error) {
        console.error("GET /notifications/count error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// جلب إشعار واحد للطالب
// ==========================================

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
                id,
                student_id,
                title,
                message,
                is_read,
                created_at,
                created_at AS notification_time
             FROM public.notifications
             WHERE id = $1
             AND student_id = $2`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الإشعار غير موجود أو لا يخص هذا الطالب"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /notifications/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// إضافة إشعار للطالب
// ==========================================

router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            title,
            message,
            is_read
        } = req.body;

        if (!student_id || !title || !message) {
            return res.status(400).json({
                error: "student_id والعنوان والرسالة مطلوبة"
            });
        }

        // ==========================================
        // التأكد أن الطالب موجود
        // ==========================================

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

        const result = await db.query(
            `INSERT INTO public.notifications
            (
                student_id,
                title,
                message,
                is_read
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4
            )
            RETURNING *`,
            [
                student_id,
                title,
                message,
                is_read === true
            ]
        );

        res.status(201).json({
            message: "تمت إضافة الإشعار",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error("POST /notifications error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// تعديل إشعار الطالب
// ==========================================

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            student_id,
            title,
            message,
            is_read
        } = req.body;

        if (!student_id) {
            return res.status(400).json({
                error: "student_id مطلوب"
            });
        }

        if (!title || !message) {
            return res.status(400).json({
                error: "العنوان والرسالة مطلوبان"
            });
        }

        // ==========================================
        // التأكد أن الإشعار يخص الطالب
        // ==========================================

        const ownership = await db.query(
            `SELECT id
             FROM public.notifications
             WHERE id = $1
             AND student_id = $2`,
            [id, student_id]
        );

        if (ownership.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك تعديل هذا الإشعار"
            });
        }

        const result = await db.query(
            `UPDATE public.notifications
             SET
                title = $1,
                message = $2,
                is_read = $3
             WHERE id = $4
             AND student_id = $5
             RETURNING *`,
            [
                title,
                message,
                is_read === true,
                id,
                student_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الإشعار غير موجود"
            });
        }

        res.json({
            message: "تم تعديل الإشعار",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /notifications/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// تحديد الإشعار كمقروء
// ==========================================

router.put("/:id/read", async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id } = req.body;

        if (!student_id) {
            return res.status(400).json({
                error: "student_id مطلوب"
            });
        }

        const result = await db.query(
            `UPDATE public.notifications
             SET is_read = true
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [
                id,
                student_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الإشعار غير موجود أو لا يخص هذا الطالب"
            });
        }

        res.json({
            message: "تم تحديد الإشعار كمقروء",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /notifications/:id/read error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// حذف إشعار الطالب
// ==========================================

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
            `DELETE FROM public.notifications
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [
                id,
                student_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الإشعار غير موجود أو لا يخص هذا الطالب"
            });
        }

        res.json({
            message: "تم حذف الإشعار",
            notification: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /notifications/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
