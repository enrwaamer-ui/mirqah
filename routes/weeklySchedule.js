const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middlewareauth");

const validDays = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];


// =====================================
// جلب الجدول الأسبوعي
// =====================================

router.get("/", authMiddleware, async (req, res) => {

    try {

        const studentId = req.user.id;

        const result = await db.query(
            `
            SELECT
                ws.id,
                ws.subject_id,
                ws.day_of_week,
                ws.start_time,
                ws.end_time,
                ws.room,

                subjects.name AS subject_name,
                subjects.code AS subject_code

            FROM public.weekly_schedule AS ws

            JOIN public.subjects AS subjects
                ON subjects.id = ws.subject_id

            WHERE subjects.student_id = $1

            ORDER BY
                CASE ws.day_of_week
                    WHEN 'Saturday' THEN 1
                    WHEN 'Sunday' THEN 2
                    WHEN 'Monday' THEN 3
                    WHEN 'Tuesday' THEN 4
                    WHEN 'Wednesday' THEN 5
                    WHEN 'Thursday' THEN 6
                    WHEN 'Friday' THEN 7
                    ELSE 8
                END,

                ws.start_time ASC
            `,
            [studentId]
        );

        const lectures = result.rows.map(
            (row) => ({
                ...row,
                title: "محاضرة"
            })
        );

        res.json(lectures);

    } catch (error) {

        console.error(
            "GET /weekly-schedule error:",
            error
        );

        res.status(500).json({
            error: "حدث خطأ أثناء تحميل الجدول",
            details: error.message
        });
    }
});


// =====================================
// جلب محاضرة واحدة
// =====================================

router.get("/:id", authMiddleware, async (req, res) => {

    try {

        const studentId = req.user.id;
        const lectureId = req.params.id;

        const result = await db.query(
            `
            SELECT
                ws.id,
                ws.subject_id,
                ws.day_of_week,
                ws.start_time,
                ws.end_time,
                ws.room,

                subjects.name AS subject_name,
                subjects.code AS subject_code

            FROM public.weekly_schedule AS ws

            JOIN public.subjects AS subjects
                ON subjects.id = ws.subject_id

            WHERE ws.id = $1
              AND subjects.student_id = $2
            `,
            [
                lectureId,
                studentId
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "المحاضرة غير موجودة"
            });
        }

        res.json({
            ...result.rows[0],
            title: "محاضرة"
        });

    } catch (error) {

        console.error(
            "GET /weekly-schedule/:id error:",
            error
        );

        res.status(500).json({
            error: "حدث خطأ أثناء تحميل المحاضرة",
            details: error.message
        });
    }
});


// =====================================
// إضافة محاضرة
// =====================================

router.post("/", authMiddleware, async (req, res) => {

    try {

        const studentId = req.user.id;

        const {
            subject_id,
            day_of_week,
            start_time,
            end_time,
            room
        } = req.body;


        // =====================================
        // التحقق من البيانات
        // =====================================

        if (
            !subject_id ||
            !day_of_week ||
            !start_time ||
            !end_time
        ) {

            return res.status(400).json({
                error:
                    "المادة ويوم الأسبوع ووقت البداية والنهاية مطلوبة"
            });
        }


        // =====================================
        // التحقق من اليوم
        // =====================================

        if (
            !validDays.includes(
                day_of_week
            )
        ) {

            return res.status(400).json({
                error:
                    "يوم الأسبوع غير صحيح"
            });
        }


        // =====================================
        // التحقق من الوقت
        // =====================================

        if (
            end_time <= start_time
        ) {

            return res.status(400).json({
                error:
                    "وقت النهاية يجب أن يكون بعد وقت البداية"
            });
        }


        // =====================================
        // التأكد أن المادة تخص الطالب
        // =====================================

        const subjectResult =
            await db.query(
                `
                SELECT
                    id,
                    name,
                    code

                FROM public.subjects

                WHERE id = $1
                  AND student_id = $2
                `,
                [
                    subject_id,
                    studentId
                ]
            );


        if (
            subjectResult.rows.length === 0
        ) {

            return res.status(403).json({
                error:
                    "هذه المادة ليست ضمن موادك"
            });
        }


        // =====================================
        // منع التكرار
        // =====================================

        const duplicateResult =
            await db.query(
                `
                SELECT id

                FROM public.weekly_schedule

                WHERE subject_id = $1
                  AND day_of_week = $2
                  AND start_time = $3
                  AND end_time = $4
                `,
                [
                    subject_id,
                    day_of_week,
                    start_time,
                    end_time
                ]
            );


        if (
            duplicateResult.rows.length > 0
        ) {

            return res.status(400).json({
                error:
                    "هذه المحاضرة موجودة بالفعل في الجدول"
            });
        }


        // =====================================
        // إضافة المحاضرة
        // =====================================

        const result =
            await db.query(
                `
                INSERT INTO public.weekly_schedule
                (
                    subject_id,
                    day_of_week,
                    start_time,
                    end_time,
                    room
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )

                RETURNING
                    id,
                    subject_id,
                    day_of_week,
                    start_time,
                    end_time,
                    room
                `,
                [
                    subject_id,
                    day_of_week,
                    start_time,
                    end_time,
                    room || null
                ]
            );


        const lecture =
            result.rows[0];


        res.status(201).json({

            message:
                "تمت إضافة المحاضرة بنجاح",

            lecture: {

                ...lecture,

                title: "محاضرة",

                subject_name:
                    subjectResult.rows[0].name,

                subject_code:
                    subjectResult.rows[0].code
            }
        });


    } catch (error) {

        console.error(
            "POST /weekly-schedule error:",
            error
        );

        res.status(500).json({

            error:
                "حدث خطأ أثناء إضافة المحاضرة",

            details:
                error.message
        });
    }
});


// =====================================
// تعديل محاضرة
// =====================================

router.put("/:id", authMiddleware, async (req, res) => {

    try {

        const studentId = req.user.id;
        const lectureId = req.params.id;

        const {
            subject_id,
            day_of_week,
            start_time,
            end_time,
            room
        } = req.body;


        if (
            !subject_id ||
            !day_of_week ||
            !start_time ||
            !end_time
        ) {

            return res.status(400).json({
                error:
                    "المادة ويوم الأسبوع ووقت البداية والنهاية مطلوبة"
            });
        }


        if (
            !validDays.includes(
                day_of_week
            )
        ) {

            return res.status(400).json({
                error:
                    "يوم الأسبوع غير صحيح"
            });
        }


        if (
            end_time <= start_time
        ) {

            return res.status(400).json({
                error:
                    "وقت النهاية يجب أن يكون بعد وقت البداية"
            });
        }


        // =====================================
        // التحقق من المادة
        // =====================================

        const subjectResult =
            await db.query(
                `
                SELECT
                    id,
                    name,
                    code

                FROM public.subjects

                WHERE id = $1
                  AND student_id = $2
                `,
                [
                    subject_id,
                    studentId
                ]
            );


        if (
            subjectResult.rows.length === 0
        ) {

            return res.status(403).json({
                error:
                    "هذه المادة ليست ضمن موادك"
            });
        }


        // =====================================
        // التحقق أن المحاضرة تخص الطالب
        // =====================================

        const ownership =
            await db.query(
                `
                SELECT
                    ws.id

                FROM public.weekly_schedule AS ws

                JOIN public.subjects AS s
                    ON s.id = ws.subject_id

                WHERE ws.id = $1
                  AND s.student_id = $2
                `,
                [
                    lectureId,
                    studentId
                ]
            );


        if (
            ownership.rows.length === 0
        ) {

            return res.status(404).json({
                error:
                    "المحاضرة غير موجودة"
            });
        }


        // =====================================
        // التعديل
        // =====================================

        const result =
            await db.query(
                `
                UPDATE public.weekly_schedule

                SET
                    subject_id = $1,
                    day_of_week = $2,
                    start_time = $3,
                    end_time = $4,
                    room = $5

                WHERE id = $6

                RETURNING
                    id,
                    subject_id,
                    day_of_week,
                    start_time,
                    end_time,
                    room
                `,
                [
                    subject_id,
                    day_of_week,
                    start_time,
                    end_time,
                    room || null,
                    lectureId
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({
                error:
                    "المحاضرة غير موجودة"
            });
        }


        res.json({

            message:
                "تم تعديل المحاضرة بنجاح",

            lecture: {

                ...result.rows[0],

                title:
                    "محاضرة",

                subject_name:
                    subjectResult.rows[0].name,

                subject_code:
                    subjectResult.rows[0].code
            }
        });


    } catch (error) {

        console.error(
            "PUT /weekly-schedule/:id error:",
            error
        );

        res.status(500).json({

            error:
                "حدث خطأ أثناء تعديل المحاضرة",

            details:
                error.message
        });
    }
});


// =====================================
// حذف محاضرة
// =====================================

router.delete("/:id", authMiddleware, async (req, res) => {

    try {

        const studentId = req.user.id;
        const lectureId = req.params.id;


        const ownership =
            await db.query(
                `
                SELECT
                    ws.id

                FROM public.weekly_schedule AS ws

                JOIN public.subjects AS s
                    ON s.id = ws.subject_id

                WHERE ws.id = $1
                  AND s.student_id = $2
                `,
                [
                    lectureId,
                    studentId
                ]
            );


        if (
            ownership.rows.length === 0
        ) {

            return res.status(404).json({
                error:
                    "المحاضرة غير موجودة"
            });
        }


        const result =
            await db.query(
                `
                DELETE FROM public.weekly_schedule

                WHERE id = $1

                RETURNING *
                `,
                [
                    lectureId
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({
                error:
                    "المحاضرة غير موجودة"
            });
        }


        res.json({
            message:
                "تم حذف المحاضرة بنجاح",

            lecture:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "DELETE /weekly-schedule/:id error:",
            error
        );

        res.status(500).json({

            error:
                "حدث خطأ أثناء حذف المحاضرة",

            details:
                error.message
        });
    }
});


module.exports = router;
