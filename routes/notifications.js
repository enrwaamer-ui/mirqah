const express = require("express");
const router = express.Router();
const db = require("../db");


// جلب إشعارات الطالب
router.get("/", async (req, res) => {
    try {
        const { student_id } = req.query;

        const result = await db.query(
           ` SELECT *
             FROM public.notifications
             WHERE student_id = $1
             ORDER BY notification_time DESC`,
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


// عدد الإشعارات غير المقروءة
router.get("/count", async (req, res) => {
    try {
        const{student_id } = req.query;
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
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// جلب إشعار واحد
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
           ` SELECT *
             FROM public.notifications
             WHERE id = $1,
            [id]`
        );

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// إضافة إشعار
router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            lecture_id,
            message,
            notification_time,
            is_read
        } = req.body;

        const result = await db.query(
           ` INSERT INTO public.notifications
            (student_id, lecture_id, message, notification_time, is_read)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *,
            [
                student_id,
                lecture_id,
                message,
                notification_time,
                is_read || false
            ]`
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// تعديل إشعار
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            message,
            is_read
        } = req.body;

        const result = await db.query(
            `UPDATE public.notifications
             SET message = $1,
                 is_read = $2
             WHERE id = $3
             RETURNING *,
            [
                message,
                is_read,
                id
            ]`
        );

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// حذف إشعار
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
           ` DELETE FROM public.notifications
             WHERE id = $1,
            [id]`
        );

        res.json({
            message: "Notification deleted"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

// تحديد الإشعار كمقروء
router.put("/:id/read", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `UPDATE public.notifications
             SET is_read = true
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Notification not found"
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


module.exports = router;