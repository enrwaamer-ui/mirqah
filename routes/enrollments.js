const express = require("express");
const router = express.Router();
const db = require("../db");


// ============================================
// عرض كل التسجيلات مع اسم الطالب والمادة
// ============================================
router.get("/", async (req, res) => {
    try {

        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                students.name AS student_name,
                students.email AS student_email,
                enrollments.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code,
                enrollments.academic_year,
                enrollments.semester,
                enrollments.status
             FROM public.enrollments
             JOIN public.students
                ON enrollments.student_id = students.id
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             ORDER BY students.name, subjects.name`
        );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }
});


// ============================================
// عرض تسجيل واحد
// ============================================
router.get("/:id", async (req, res) => {
    try {

        const { id } = req.params;

        const result = await db.query(
            `SELECT
                enrollments.id,
                enrollments.student_id,
                students.name AS student_name,
                enrollments.subject_id,
                subjects.name AS subject_name,
                subjects.code AS subject_code,
                enrollments.academic_year,
                enrollments.semester,
                enrollments.status
             FROM public.enrollments
             JOIN public.students
                ON enrollments.student_id = students.id
             JOIN public.subjects
                ON enrollments.subject_id = subjects.id
             WHERE enrollments.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Enrollment not found"
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


// ============================================
// إضافة تسجيل جديد
// ============================================
router.post("/", async (req, res) => {
    try {

        const {
            student_id,
            subject_id,
            academic_year,
            semester,
            status
        } = req.body;


        if (!student_id || !subject_id) {

            return res.status(400).json({
                error: "الطالب والمادة مطلوبان"
            });

        }


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


        // التأكد أن المادة موجودة
        const subject = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );


        if (subject.rows.length === 0) {

            return res.status(404).json({
                error: "المادة غير موجودة"
            });

        }


        // منع التسجيل المكرر
        const existing = await db.query(
            `SELECT id
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2`,
            [student_id, subject_id]
        );


        if (existing.rows.length > 0) {

            return res.status(400).json({
                error: "الطالب مسجل في هذه المادة بالفعل"
            });

        }


        const result = await db.query(
            `INSERT INTO public.enrollments
            (
                student_id,
                subject_id,
                academic_year,
                semester,
                status
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                student_id,
                subject_id,
                academic_year || null,
                semester || null,
                status || "active"
            ]
        );


        res.status(201).json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }
});


// ============================================
// تعديل تسجيل
// ============================================
router.put("/:id", async (req, res) => {
    try {

        const { id } = req.params;

        const {
            student_id,
            subject_id,
            academic_year,
            semester,
            status
        } = req.body;


        const result = await db.query(
            `UPDATE public.enrollments
             SET
                student_id = $1,
                subject_id = $2,
                academic_year = $3,
                semester = $4,
                status = $5
             WHERE id = $6
             RETURNING *`,
            [
                student_id,
                subject_id,
                academic_year,
                semester,
                status,
                id
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Enrollment not found"
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


// ============================================
// حذف تسجيل
// ============================================
router.delete("/:id", async (req, res) => {
    try {

        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM public.enrollments
             WHERE id = $1
             RETURNING *`,
            [id]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Enrollment not found"
            });

        }


        res.json({
            message: "Enrollment deleted successfully",
            enrollment: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }
});


module.exports = router;
