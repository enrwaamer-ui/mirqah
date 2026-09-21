const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================================
// عرض محاضرات الطالب
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
                lectures.id,
                lectures.student_id,
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
             WHERE lectures.student_id = $1
             ORDER BY
                lectures.lecture_date,
                lectures.start_time`,
            [student_id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /lectures error:", error);

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

        if (!student_id) {
            return res.status(400).json({
                error: "student_id مطلوب"
            });
        }

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.student_id,
                lectures.subject_id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                subjects.name AS subject_name
             FROM public.lectures
             JOIN public.subjects
                ON lectures.subject_id = subjects.id
             WHERE lectures.student_id = $1
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
        console.error("GET /lectures/next error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// عرض محاضرة واحدة للطالب
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
                lectures.id,
                lectures.student_id,
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
             WHERE lectures.id = $1
             AND lectures.student_id = $2`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة أو لا تخص هذا الطالب"
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


// ==========================================
// إضافة محاضرة للطالب
// ==========================================
router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall
        } = req.body;

        if (
            !student_id ||
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
            `SELECT id, name
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        // التأكد أن الطالب مسجل في المادة
        const enrollment = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             AND status = 'active'`,
            [student_id, subject_id]
        );

        if (enrollment.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك إضافة محاضرة لمادة غير مسجل فيها"
            });
        }

        const subjectName = subject.rows[0].name;

        // إضافة المحاضرة وربطها بالطالب
        const result = await db.query(
            `INSERT INTO public.lectures
            (
                student_id,
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
                $7,
                $8
            )
            RETURNING *`,
            [
                student_id,
                subject_id,
                subjectName,
                title,
                lecture_date,
                start_time,
                end_time,
                hall
            ]
        );

        res.status(201).json({
            message: "تمت إضافة المحاضرة",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("POST /lectures error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// تعديل محاضرة الطالب
// ==========================================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            student_id,
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall
        } = req.body;

        if (
            !student_id ||
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

        // التأكد أن المحاضرة تخص الطالب
        const ownership = await db.query(
            `SELECT id
             FROM public.lectures
             WHERE id = $1
             AND student_id = $2`,
            [id, student_id]
        );

        if (ownership.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك تعديل هذه المحاضرة"
            });
        }

        // التأكد أن المادة موجودة
        const subject = await db.query(
            `SELECT id, name
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        // التأكد أن الطالب مسجل في المادة الجديدة
        const enrollment = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             AND status = 'active'`,
            [student_id, subject_id]
        );

        if (enrollment.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك نقل المحاضرة إلى مادة غير مسجل فيها"
            });
        }

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
             AND student_id = $9
             RETURNING *`,
            [
                subject_id,
                subject.rows[0].name,
                title,
                lecture_date,
                start_time,
                end_time,
                hall,
                id,
                student_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة"
            });
        }

        res.json({
            message: "تم تعديل المحاضرة",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /lectures/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// حذف محاضرة الطالب
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
            `DELETE FROM public.lectures
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة أو لا تخص هذا الطالب"
            });
        }

        res.json({
            message: "تم حذف المحاضرة",
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
