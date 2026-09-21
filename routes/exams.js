
const express = require("express");
const router = express.Router();
const db = require("../db");


// ==========================================
// عرض امتحانات الطالب
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
                exams.id,
                exams.student_id,
                exams.subject_id,
                exams.subject_name,
                exams.exam_date,
                exams.start_time,
                exams.hall,
                subjects.name AS subject_display_name
             FROM public.exams
             JOIN public.subjects
                ON exams.subject_id = subjects.id
             WHERE exams.student_id = $1
             ORDER BY
                exams.exam_date,
                exams.start_time`,
            [student_id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /exams error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// عرض امتحان واحد
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
                exams.id,
                exams.student_id,
                exams.subject_id,
                exams.subject_name,
                exams.exam_date,
                exams.start_time,
                exams.hall,
                subjects.name AS subject_display_name
             FROM public.exams
             JOIN public.subjects
                ON exams.subject_id = subjects.id
             WHERE exams.id = $1
             AND exams.student_id = $2`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الامتحان غير موجود ضمن امتحاناتك"
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


// ==========================================
// إضافة امتحان جديد للمستخدم
// ==========================================

router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            exam_date,
            start_time,
            hall
        } = req.body;

        // ==========================================
        // التأكد من البيانات
        // ==========================================

        if (
            !student_id ||
            !subject_id ||
            !exam_date ||
            !start_time ||
            !hall
        ) {
            return res.status(400).json({
                error: "جميع بيانات الامتحان مطلوبة"
            });
        }

        // ==========================================
        // التأكد أن الطالب موجود
        // ==========================================

        const studentResult = await db.query(
            `SELECT id
             FROM public.students
             WHERE id = $1`,
            [student_id]
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        // ==========================================
        // التأكد أن المادة موجودة
        // ==========================================

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

        // ==========================================
        // التأكد أن الطالب مسجل في المادة
        // ==========================================

        const enrollmentResult = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             AND status = 'active'`,
            [student_id, subject_id]
        );

        if (enrollmentResult.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك إضافة امتحان لمادة غير مسجل فيها"
            });
        }

        const subjectName = subjectResult.rows[0].name;

        // ==========================================
        // إضافة الامتحان
        // ==========================================

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
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
            )
            RETURNING *`,
            [
                student_id,
                subject_id,
                subjectName,
                exam_date,
                start_time,
                hall
            ]
        );

        res.status(201).json({
            message: "تمت إضافة الامتحان",
            exam: result.rows[0]
        });

    } catch (error) {
        console.error("POST /exams error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// تعديل امتحان
// ==========================================

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            student_id,
            subject_id,
            exam_date,
            start_time,
            hall
        } = req.body;

        if (
            !student_id ||
            !subject_id ||
            !exam_date ||
            !start_time ||
            !hall
        ) {
            return res.status(400).json({
                error: "جميع بيانات الامتحان مطلوبة"
            });
        }

        // ==========================================
        // التأكد أن الامتحان ملك لهذا الطالب
        // ==========================================

        const ownership = await db.query(
            `SELECT id
             FROM public.exams
             WHERE id = $1
             AND student_id = $2`,
            [id, student_id]
        );

        if (ownership.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك تعديل هذا الامتحان"
            });
        }

        // ==========================================
        // التأكد أن المادة موجودة
        // ==========================================

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

        // ==========================================
        // التأكد أن الطالب مسجل في المادة
        // ==========================================

        const enrollmentResult = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             AND status = 'active'`,
            [student_id, subject_id]
        );

        if (enrollmentResult.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك نقل الامتحان إلى مادة غير مسجل فيها"
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
                subjectResult.rows[0].name,
                exam_date,
                start_time,
                hall,
                id,
                student_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Exam not found"
            });
        }

        res.json({
            message: "تم تعديل الامتحان",
            exam: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /exams/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// حذف امتحان الطالب فقط
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
            `DELETE FROM public.exams
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الامتحان غير موجود ضمن امتحاناتك"
            });
        }

        res.json({
            message: "تم حذف الامتحان",
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
