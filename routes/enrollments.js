const express = require("express");
const router = express.Router();
const db = require("../db");


// عرض كل التسجيلات
router.get("/", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM public.enrollments"
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// عرض تسجيل واحد حسب ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            "SELECT * FROM public.enrollments WHERE id = $1",
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


// إضافة تسجيل جديد
router.post("/", async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            academic_year,
            semester,
            status
        } = req.body;

        const result = await db.query(
            `INSERT INTO public.enrollments
            (student_id, subject_id, academic_year, semester, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                student_id,
                subject_id,
                academic_year,
                semester,
                status
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


// تعديل تسجيل
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
           ` UPDATE public.enrollments
            SET student_id = $1,
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


// حذف تسجيل
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            "DELETE FROM public.enrollments WHERE id = $1 RETURNING *",
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