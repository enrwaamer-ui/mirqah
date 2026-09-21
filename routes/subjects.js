const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================================
// عرض مواد الطالب
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
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.created_at
             FROM public.subjects
             JOIN public.enrollments
                ON subjects.id = enrollments.subject_id
             WHERE enrollments.student_id = $1
             AND enrollments.status = 'active'
             ORDER BY subjects.name`,
            [student_id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /subjects error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// عرض مادة واحدة للطالب
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
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.created_at
             FROM public.subjects
             JOIN public.enrollments
                ON subjects.id = enrollments.subject_id
             WHERE subjects.id = $1
             AND enrollments.student_id = $2
             AND enrollments.status = 'active'`,
            [id, student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة ضمن موادك"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /subjects/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// إضافة مادة للطالب
// ==========================================

router.post("/", async (req, res) => {
    try {
        const {
            name,
            code,
            student_id
        } = req.body;

        if (!name || !code || !student_id) {
            return res.status(400).json({
                error: "اسم المادة ورمز المادة وstudent_id مطلوبة"
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

        // ==========================================
        // البحث عن المادة
        // ==========================================

        let subject = await db.query(
            `SELECT
                id,
                name,
                code
             FROM public.subjects
             WHERE code = $1`,
            [code]
        );

        let subjectId;

        // ==========================================
        // إذا المادة غير موجودة ننشئها
        // ==========================================

        if (subject.rows.length === 0) {

            const newSubject = await db.query(
                `INSERT INTO public.subjects
                (name, code)
                VALUES ($1, $2)
                RETURNING *`,
                [name, code]
            );

            subjectId = newSubject.rows[0].id;

        } else {

            subjectId = subject.rows[0].id;
        }

        // ==========================================
        // التأكد أن الطالب غير مسجل فيها
        // ==========================================

        const existingEnrollment = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2`,
            [student_id, subjectId]
        );

        if (existingEnrollment.rows.length > 0) {
            return res.status(400).json({
                error: "أنت مسجل في هذه المادة بالفعل"
            });
        }

        // ==========================================
        // تسجيل المادة لهذا الطالب فقط
        // ==========================================

        const enrollment = await db.query(
            `INSERT INTO public.enrollments
            (
                student_id,
                subject_id,
                status
            )
            VALUES
            (
                $1,
                $2,
                'active'
            )
            RETURNING *`,
            [student_id, subjectId]
        );

        const finalSubject = await db.query(
            `SELECT
                id,
                name,
                code,
                created_at
             FROM public.subjects
             WHERE id = $1`,
            [subjectId]
        );

        res.status(201).json({
            message: "تمت إضافة المادة إلى موادك",
            subject: finalSubject.rows[0],
            enrollment: enrollment.rows[0]
        });

    } catch (error) {
        console.error("POST /subjects error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// تعديل مادة الطالب
// ==========================================

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            code,
            student_id
        } = req.body;

        if (!name || !code || !student_id) {
            return res.status(400).json({
                error: "اسم المادة ورمز المادة وstudent_id مطلوبة"
            });
        }

        // ==========================================
        // التأكد أن المادة تخص الطالب
        // ==========================================

        const ownership = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             AND status = 'active'`,
            [student_id, id]
        );

        if (ownership.rows.length === 0) {
            return res.status(403).json({
                error: "هذه المادة ليست ضمن موادك"
            });
        }

        // ==========================================
        // تعديل المادة
        // ==========================================

        const result = await db.query(
            `UPDATE public.subjects
             SET
                name = $1,
                code = $2
             WHERE id = $3
             RETURNING *`,
            [
                name,
                code,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        res.json({
            message: "تم تعديل المادة",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /subjects/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// حذف المادة من مواد الطالب
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

        // ==========================================
        // حذف تسجيل الطالب فقط
        // المادة نفسها تبقى في جدول subjects
        // ==========================================

        const result = await db.query(
            `DELETE FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2
             RETURNING *`,
            [
                student_id,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة ضمن موادك"
            });
        }

        res.json({
            message: "تم حذف المادة من موادك",
            enrollment: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /subjects/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
