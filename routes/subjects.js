const express = require("express");
const router = express.Router();
const db = require("../db");

// عرض المواد الخاصة بالطالب
router.get("/", async (req, res) => {
    try {
        const { student_id } = req.query;

        const result = await db.query(
            `SELECT 
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.credit_hours
             FROM public.subjects
             JOIN public.enrollments
             ON subjects.id = enrollments.subject_id
             WHERE enrollments.student_id = $1
             AND enrollments.status = 'active'`,
            [student_id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});





// عرض مادة واحدة حسب ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            "SELECT * FROM public.subjects WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Subject not found"
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


// إضافة مادة جديدة
router.post("/", async (req, res) => {
    try {
        const {
            name,
            code,
            credit_hours
        } = req.body;

        const result = await db.query(
            `INSERT INTO public.subjects
            (name, code, credit_hours)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                name,
                code,
                credit_hours
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


// تعديل مادة
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            code,
            credit_hours
        } = req.body;

        const result = await db.query(
            `UPDATE public.subjects
            SET name = $1,
                code = $2,
                credit_hours = $3
            WHERE id = $4
            RETURNING *`,
            [
                name,
                code,
                credit_hours,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Subject not found"
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


// حذف مادة
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            "DELETE FROM public.subjects WHERE id = $1 RETURNING *",
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
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;