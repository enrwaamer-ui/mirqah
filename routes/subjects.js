const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");

function adminOnly(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            error: "ليس لديك صلاحية الإدارة"
        });
    }

    next();
}

// =====================================================
// ADMIN - GET ALL SUBJECTS
// =====================================================

router.get("/admin/all", authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.student_id,
                subjects.created_at,
                students.name AS student_name,
                students.student_id AS student_number
            FROM public.subjects
            LEFT JOIN public.students
                ON subjects.student_id = students.id
            ORDER BY subjects.created_at DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("GET /subjects/admin/all error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});

// =====================================================
// ADMIN - CREATE GLOBAL SUBJECT
// =====================================================

router.post("/admin", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { name, code } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                error: "اسم المادة وكود المادة مطلوبان"
            });
        }

        const cleanName = String(name).trim();
        const cleanCode = String(code).trim();

        if (!cleanName || !cleanCode) {
            return res.status(400).json({
                error: "اسم المادة وكود المادة مطلوبان"
            });
        }

        const existing = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE code = $1
             AND student_id IS NULL`,
            [cleanCode]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: "رمز المادة موجود بالفعل"
            });
        }

        const result = await db.query(
            `INSERT INTO public.subjects
                (name, code, student_id)
             VALUES
                ($1, $2, NULL)
             RETURNING id, name, code, student_id, created_at`,
            [cleanName, cleanCode]
        );

        res.status(201).json({
            message: "تمت إضافة المادة بنجاح",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("POST /subjects/admin error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});

// =====================================================
// ADMIN - UPDATE SUBJECT
// =====================================================

router.put("/admin/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                error: "اسم المادة وكود المادة مطلوبان"
            });
        }

        const cleanName = String(name).trim();
        const cleanCode = String(code).trim();

        const subject = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE id = $1`,
            [id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        const duplicate = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE code = $1
             AND id <> $2
             AND student_id IS NULL`,
            [cleanCode, id]
        );

        if (duplicate.rows.length > 0) {
            return res.status(400).json({
                error: "رمز المادة مستخدم لمادة أخرى"
            });
        }

        const result = await db.query(
            `UPDATE public.subjects
             SET name = $1,
                 code = $2
             WHERE id = $3
             RETURNING id, name, code, student_id, created_at`,
            [cleanName, cleanCode, id]
        );

        res.json({
            message: "تم تعديل المادة بنجاح",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /subjects/admin/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});

// =====================================================
// ADMIN - DELETE SUBJECT
// =====================================================

router.delete("/admin/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const subject = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE id = $1`,
            [id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        const result = await db.query(
            `DELETE FROM public.subjects
             WHERE id = $1
             RETURNING id, name, code, student_id`,
            [id]
        );

        res.json({
            message: "تم حذف المادة بنجاح",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /subjects/admin/:id error:", error);

        res.status(500).json({
            error: "لا يمكن حذف المادة لأنها مرتبطة ببيانات أخرى أو حدث خطأ في قاعدة البيانات"
        });
    }
});

// =====================================================
// STUDENT - GET MY SUBJECTS
// =====================================================

router.get("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.student_id,
                subjects.created_at
             FROM public.subjects
             WHERE subjects.student_id = $1
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

// =====================================================
// STUDENT - GET ONE OF MY SUBJECTS
// =====================================================

router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.student_id,
                subjects.created_at
             FROM public.subjects
             WHERE subjects.id = $1
             AND subjects.student_id = $2`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة في حسابك"
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

// =====================================================
// STUDENT - ADD MY SUBJECT
// =====================================================

router.post("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const { name, code } = req.body;

        if (!name) {
            return res.status(400).json({
                error: "اسم المادة مطلوب"
            });
        }

        const cleanName = String(name).trim();
        const cleanCode = code ? String(code).trim() : null;

        if (!cleanName) {
            return res.status(400).json({
                error: "اسم المادة مطلوب"
            });
        }

        // منع الطالب من إضافة نفس المادة مرتين
        const existing = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE student_id = $1
             AND LOWER(name) = LOWER($2)`,
            [studentId, cleanName]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: "هذه المادة موجودة عندك بالفعل"
            });
        }

        const result = await db.query(
            `INSERT INTO public.subjects
                (name, code, student_id)
             VALUES
                ($1, $2, $3)
             RETURNING
                id,
                name,
                code,
                student_id,
                created_at`,
            [cleanName, cleanCode || null, studentId]
        );

        res.status(201).json({
            message: "تمت إضافة المادة بنجاح",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("POST /subjects error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});

// =====================================================
// STUDENT - UPDATE MY SUBJECT
// =====================================================

router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const { name, code } = req.body;

        if (!name) {
            return res.status(400).json({
                error: "اسم المادة مطلوب"
            });
        }

        const cleanName = String(name).trim();
        const cleanCode = code ? String(code).trim() : null;

        const existing = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE id = $1
             AND student_id = $2`,
            [id, studentId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة في حسابك"
            });
        }

        const duplicate = await db.query(
            `SELECT id
             FROM public.subjects
             WHERE student_id = $1
             AND LOWER(name) = LOWER($2)
             AND id <> $3`,
            [studentId, cleanName, id]
        );

        if (duplicate.rows.length > 0) {
            return res.status(400).json({
                error: "هذه المادة موجودة عندك بالفعل"
            });
        }

        const result = await db.query(
            `UPDATE public.subjects
             SET name = $1,
                 code = $2
             WHERE id = $3
             AND student_id = $4
             RETURNING
                id,
                name,
                code,
                student_id,
                created_at`,
            [cleanName, cleanCode || null, id, studentId]
        );

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

// =====================================================
// STUDENT - DELETE MY SUBJECT
// =====================================================

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `DELETE FROM public.subjects
             WHERE id = $1
             AND student_id = $2
             RETURNING
                id,
                name,
                code,
                student_id`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة في حسابك"
            });
        }

        res.json({
            message: "تم حذف المادة بنجاح",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /subjects/:id error:", error);

        res.status(500).json({
            error: "لا يمكن حذف المادة لأنها مرتبطة ببيانات أخرى أو حدث خطأ في قاعدة البيانات"
        });
    }
});

module.exports = router;
