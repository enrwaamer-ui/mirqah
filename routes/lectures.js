const express = require("express");
const router = express.Router();
const db = require("../db");


// ==========================================
// عرض محاضرات الطالب
// ==========================================

router.get("/", async (req, res) => {

    try {

        const { student_id } = req.query;


        // إذا فيه طالب، نعرض محاضرات مواده فقط

        if (student_id) {

            const result = await db.query(
                `SELECT
                    lectures.id,
                    lectures.subject_id,
                    subjects.name AS subject_name,
                    lectures.title,
                    lectures.lecture_date,
                    lectures.start_time,
                    lectures.end_time,
                    lectures.hall
                 FROM public.lectures
                 JOIN public.subjects
                    ON lectures.subject_id = subjects.id
                 JOIN public.enrollments
                    ON lectures.subject_id = enrollments.subject_id
                 WHERE enrollments.student_id = $1
                 AND enrollments.status = 'active'
                 ORDER BY
                    lectures.lecture_date,
                    lectures.start_time`,
                [student_id]
            );

            return res.json(result.rows);
        }


        // إذا مافيش student_id
        // نعرض كل المحاضرات للإدارة

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.subject_id,
                lectures.subject_name,
                subjects.name AS subject_display_name,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             ORDER BY
                lectures.lecture_date,
                lectures.start_time`
        );


        res.json(result.rows);


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }

});



// ==========================================
// المحاضرة القادمة للطالب
// ==========================================

router.get("/next", async (req, res) => {

    try {

        const { student_id } = req.query;


        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                subjects.name AS subject_name
             FROM public.lectures
             JOIN public.subjects
                ON lectures.subject_id = subjects.id
             JOIN public.enrollments
                ON lectures.subject_id = enrollments.subject_id
             WHERE enrollments.student_id = $1
             AND enrollments.status = 'active'
             AND (
                 lectures.lecture_date > CURRENT_DATE
                 OR (
                     lectures.lecture_date = CURRENT_DATE
                     AND lectures.start_time >= CURRENT_TIME
                 )
             )
             ORDER BY
                lectures.lecture_date,
                lectures.start_time
             LIMIT 1`,
            [student_id]
        );


        if (result.rows.length === 0) {

            return res.json(null);

        }


        res.json(result.rows[0]);


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }

});



// ==========================================
// عرض محاضرة واحدة
// ==========================================

router.get("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const result = await db.query(
            `SELECT *
             FROM public.lectures
             WHERE id = $1`,
            [id]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Lecture not found"
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



// ==========================================
// إضافة محاضرة جديدة
// ==========================================

router.post("/", async (req, res) => {

    try {

        const {
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall
        } = req.body;


        // التأكد من البيانات المطلوبة

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


        // جلب اسم المادة من جدول المواد

        const subjectResult = await db.query(
            `SELECT
                id,
                name
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );


        if (subjectResult.rows.length === 0) {

            return res.status(404).json({
                error: "المادة غير موجودة"
            });

        }


        const subjectName =
            subjectResult.rows[0].name;


        // إضافة المحاضرة
        // subject_name يتم تعبئته تلقائياً

        const result = await db.query(
            `INSERT INTO public.lectures
            (
                subject_id,
                subject_name,
                title,
                lecture_date,
                start_time,
                end_time,
                hall
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7
            )
            RETURNING *`,
            [
                subject_id,
                subjectName,
                title,
                lecture_date,
                start_time,
                end_time,
                hall
            ]
        );


        res.status(201).json(
            result.rows[0]
        );


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }

});



// ==========================================
// تعديل محاضرة
// ==========================================

router.put("/:id", async (req, res) => {

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


        // جلب اسم المادة

        const subjectResult = await db.query(
            `SELECT name
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );


        if (subjectResult.rows.length === 0) {

            return res.status(404).json({
                error: "المادة غير موجودة"
            });

        }


        const subjectName =
            subjectResult.rows[0].name;


        const result = await db.query(
            `UPDATE public.lectures
             SET
                subject_id = $1,
                subject_name = $2,
                title = $3,
                lecture_date = $4,
                start_time = $5,
                end_time = $6,
                hall = $7
             WHERE id = $8
             RETURNING *`,
            [
                subject_id,
                subjectName,
                title,
                lecture_date,
                start_time,
                end_time,
                hall,
                id
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Lecture not found"
            });

        }


        res.json(
            result.rows[0]
        );


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }

});



// ==========================================
// حذف محاضرة
// ==========================================

router.delete("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const result = await db.query(
            `DELETE FROM public.lectures
             WHERE id = $1
             RETURNING *`,
            [id]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Lecture not found"
            });

        }


        res.json({
            message: "Lecture deleted successfully",
            lecture: result.rows[0]
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }

});


module.exports = router;
