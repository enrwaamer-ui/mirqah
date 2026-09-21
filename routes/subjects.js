const express = require("express");
const router = express.Router();
const db = require("../db");


// ==========================================
// عرض المواد
// ==========================================

router.get("/", async (req, res) => {
    try {
        const { student_id } = req.query;

        // ==========================================
        // إذا كان هناك طالب:
        // نعرض المواد المسجل فيها هذا الطالب فقط
        // ==========================================

        if (student_id) {
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

            return res.json(result.rows);
        }

        // ==========================================
        // بدون طالب:
        // نرجع جميع المواد
        // هذا مطلوب حاليًا لصفحات الإدارة
        // ==========================================

        const result = await db.query(
            `SELECT
                id,
                name,
                code,
                created_at
             FROM public.subjects
             ORDER BY name`
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
// عرض مادة واحدة
// ==========================================

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id } = req.query;

        // ==========================================
        // إذا كان الطلب من طالب:
        // نتأكد أن المادة مسجل فيها الطالب
        // ==========================================

        if (student_id) {
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
                    error: "المادة غير موجودة أو غير مسجل فيها"
                });
            }

            return res.json(result.rows[0]);
        }

        // ==========================================
        // بدون student_id
        // عرض المادة بشكل عام
        // ==========================================

        const result = await db.query(
            `SELECT *
             FROM public.subjects
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Subject not found"
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
// إضافة مادة
// ==========================================

router.post("/", async (req, res) => {
    try {
        const {
            name,
            code,
            student_id
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                error: "اسم المادة ورمز المادة مطلوبان"
            });
        }

        // ==========================================
        // إذا كان الطالب هو الذي يضيف المادة
        // ==========================================

        if (student_id) {

            // التأكد أن الطالب موجود
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
            // البحث عن المادة الموجودة مسبقًا
            // ==========================================

            let subject = await db.query(
                `SELECT id, name, code
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
            // التأكد أن الطالب مش مسجل فيها مسبقًا
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
                (student_id, subject_id, status)
                VALUES ($1, $2, 'active')
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

            return res.status(201).json({
                message: "تمت إضافة المادة إلى موادك",
                subject: finalSubject.rows[0],
                enrollment: enrollment.rows[0]
            });
        }

        // ==========================================
        // إضافة عامة بدون طالب
        // موجودة حاليًا حتى ما نخربش صفحات الإدارة
        // ==========================================

        const result = await db.query(
            `INSERT INTO public.subjects
            (name, code)
            VALUES ($1, $2)
            RETURNING *`,
            [name, code]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("POST /subjects error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// تعديل مادة
// ==========================================

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            code,
            student_id
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                error: "اسم المادة ورمز المادة مطلوبان"
            });
        }

        // ==========================================
        // إذا كان الطالب يعدل مادة خاصة به
        // ==========================================

        if (student_id) {

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
        }

        const result = await db.query(
            `UPDATE public.subjects
             SET
                name = $1,
                code = $2
             WHERE id = $3
             RETURNING *`,
            [name, code, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Subject not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("PUT /subjects/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==========================================
// حذف مادة من مواد الطالب
// ==========================================

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id } = req.query;

        // ==========================================
        // طالب يحذف المادة من حسابه
        // ==========================================

        if (student_id) {

            const result = await db.query(
                `DELETE FROM public.enrollments
                 WHERE student_id = $1
                 AND subject_id = $2
                 RETURNING *`,
                [student_id, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "المادة غير موجودة ضمن موادك"
                });
            }

            return res.json({
                message: "تم حذف المادة من موادك",
                enrollment: result.rows[0]
            });
        }

        // ==========================================
        // حذف عام
        // يبقى حاليًا لصفحة الإدارة
        // ==========================================

        const result = await db.query(
            `DELETE FROM public.subjects
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Subject not found"
            });
        }

        res.json({
            message: "Subject deleted successfully",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /subjects/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
