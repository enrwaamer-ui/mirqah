const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middlewareauth");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const { endpoint, keys } = req.body;

        if (`!endpoint  !keys  !keys.p256dh || !keys.auth`) {
            return res.status(400).json({
                error: "بيانات الاشتراك غير مكتملة"
            });
        }

        await db.query(`
            
            INSERT INTO public.push_subscriptions
            (
                student_id,
                endpoint,
                p256dh,
                auth
            )
            VALUES
            ($1, $2, $3, $4)
            ON CONFLICT (endpoint)
            DO UPDATE SET
                student_id = EXCLUDED.student_id,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth
            ,
            [
                studentId,
                endpoint,
                keys.p256dh,
                keys.auth
            ]`
        );

        res.json({
            success: true,
            message: "تم تسجيل الجهاز للإشعارات"
        });

    } catch (error) {
        console.error("POST /push-subscriptions error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});

module.exports = router;
