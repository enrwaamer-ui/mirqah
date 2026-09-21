const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");


// ============================================
// عرض مواد الطالب الحالي
// GET /subjects
// ============================================
router.get("/", authMiddleware, async (req, res) => {
    try {

        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                enrollments.id AS enrollment_id,
                subjects.id,
                subjects.name,
                subjects.code,
                enrollments.status,
                enrollments.created_at
             FROM public.enrollments
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE enrollments.student_id = $1
             AND enrollments.status = 'active'
             ORDER BY subjects.name`,
            [studentId]
        );

        res.json(result.rows);

    } catch (error) {

        console.error("GET /subjects error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// عرض مادة واحدة للطالب الحالي
// GET /subjects/:id
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
    try {

        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                enrollments.id AS enrollment_id,
                subjects.id,
                subjects.name,
                subjects.code,
                enrollments.status,
                enrollments.created_at
             FROM public.enrollments
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE subjects.id = $1
             AND enrollments.student_id = $2
             AND enrollments.status = 'active'`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة أو غير مسجل فيها"
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


// ============================================
// إضافة مادة للطالب الحالي
// POST /subjects
// ============================================
router.post("/", authMiddleware, async (req, res) => {
    try {

        const {
            name,
            code
        } = req.body;

        const studentId = req.user.id;

        if (!name || !code) {
            return res.status(400).json({
                error: "اسم المادة وكود المادة مطلوبان"
            });
        }

        const student = await db.query(
            `SELECT id
             FROM public.students
             WHERE id = $1`,
            [studentId]
        );

        if (student.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        let subject = await db.query(
            `SELECT id, name, code
             FROM public.subjects
             WHERE code = $1`,
            [code]
        );

        let subjectId;

        if (subject.rows.length > 0) {

            subjectId = subject.rows[0].id;

        } else {

            const newSubject = await db.query(
                `INSERT INTO public.subjects
                (
                    name,
                    code
                )
                VALUES ($1, $2)
                RETURNING id, name, code`,
                [name, code]
            );

            subjectId = newSubject.rows[0].id;
        }

        const existingEnrollment = await db.query(
            `SELECT id, status
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2`,
            [studentId, subjectId]
        );

        if (existingEnrollment.rows.length > 0) {

            if (existingEnrollment.rows[0].status === "active") {
                return res.status(400).json({
                    error: "أنت مسجل في هذه المادة بالفعل"
                });
            }

            const restored = await db.query(
                `UPDATE public.enrollments
                 SET status = 'active'
                 WHERE id = $1
                 RETURNING *`,
                [existingEnrollment.rows[0].id]
            );

            return res.status(201).json({
                message: "تمت إعادة إضافة المادة",
                enrollment: restored.rows[0]
            });
        }

        const enrollment = await db.query(
            `INSERT INTO public.enrollments
            (
                student_id,
                subject_id,
                status
            )
            VALUES ($1, $2, 'active')
            RETURNING *`,
            [studentId, subjectId]
        );

        res.status(201).json({
            message: "تمت إضافة المادة بنجاح",
            enrollment: enrollment.rows[0]
        });

    } catch (error) {

        console.error("POST /subjects error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// تعديل مادة الطالب الحالي
// PUT /subjects/:id
// ============================================
router.put("/:id", authMiddleware, async (req, res) => {
    try {

        const { id } = req.params;
        const {
            name,
            code
        } = req.body;

        const studentId = req.user.id;

        if (!name || !code) {
            return res.status(400).json({
                error: "اسم المادة وكود المادة مطلوبان"
            });
        }

        const enrollment = await db.query(
            `SELECT enrollments.id
             FROM public.enrollments
             WHERE enrollments.subject_id = $1
             AND enrollments.student_id = $2
             AND enrollments.status = 'active'`,
            [id, studentId]
        );

        if (enrollment.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة أو غير مسجل فيها"
            });
        }

        const result = await db.query(
            `UPDATE public.subjects
             SET
                name = $1,
                code = $2
             WHERE id = $3
             RETURNING id, name, code`,
            [name, code, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        res.json({
            message: "تم تعديل المادة بنجاح",
            subject: result.rows[0]
        });

    } catch (error) {

        console.error("PUT /subjects/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// حذف المادة من مواد الطالب
// DELETE /subjects/:id
// ============================================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {

        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `UPDATE public.enrollments
             SET status = 'inactive'
             WHERE subject_id = $1
             AND student_id = $2
             RETURNING *`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة في موادك"
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
