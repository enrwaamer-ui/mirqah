const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");

// ============================================
// التحقق من صلاحية المدير
// ============================================

function adminOnly(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            error: "ليس لديك صلاحية الإدارة"
        });
    }

    next();
}

// =====================================================
// ADMIN ROUTES
// =====================================================

// ============================================
// عرض جميع المواد للإدارة
// GET /subjects/admin/all
// ============================================

router.get("/admin/all", authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.created_at,
                COUNT(
                    CASE
                        WHEN enrollments.status = 'active'
                        THEN enrollments.id
                    END
                ) AS students_count
             FROM public.subjects
             LEFT JOIN public.enrollments
                ON enrollments.subject_id = subjects.id
             GROUP BY
                subjects.id,
                subjects.name,
                subjects.code,
                subjects.created_at
             ORDER BY subjects.name`
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /subjects/admin/all error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});

// ============================================
// إضافة مادة من الإدارة
// POST /subjects/admin
// ============================================

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
             WHERE code = $1`,
            [cleanCode]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: "رمز المادة موجود بالفعل"
            });
        }

        const result = await db.query(
            `INSERT INTO public.subjects
            (name, code)
            VALUES ($1, $2)
            RETURNING id, name, code, created_at`,
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

// ============================================
// حذف مادة من الإدارة
// DELETE /subjects/admin/:id
// ============================================

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
             RETURNING id, name, code`,
            [id]
        );

        res.json({
            message: "تم حذف المادة بنجاح",
            subject: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /subjects/admin/:id error:", error);

        res.status(500).json({
            error:
                "لا يمكن حذف المادة لأنها مرتبطة ببيانات أخرى أو حدث خطأ في قاعدة البيانات"
        });
    }
});

// ============================================
// تعديل مادة من الإدارة
// PUT /subjects/admin/:id
// ============================================

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

        if (!cleanName || !cleanCode) {
            return res.status(400).json({
                error: "اسم المادة وكود المادة مطلوبان"
            });
        }

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
             AND id <> $2`,
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
             RETURNING id, name, code, created_at`,
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
// STUDENT ROUTES
// =====================================================

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
// تسجيل الطالب في مادة موجودة
// POST /subjects
// ============================================

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { subject_id } = req.body;
        const studentId = req.user.id;

        if (!subject_id) {
            return res.status(400).json({
                error: "رقم المادة مطلوب"
            });
        }

        const subject = await db.query(
            `SELECT id, name, code
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        const existing = await db.query(
            `SELECT id, status
             FROM public.enrollments
             WHERE student_id = $1
             AND subject_id = $2`,
            [studentId, subject_id]
        );

        if (existing.rows.length > 0) {

            if (existing.rows[0].status === "active") {
                return res.status(400).json({
                    error: "أنت مسجل في هذه المادة بالفعل"
                });
            }

            const restored = await db.query(
                `UPDATE public.enrollments
                 SET status = 'active'
                 WHERE id = $1
                 RETURNING *`,
                [existing.rows[0].id]
            );

            return res.status(201).json({
                message: "تمت إعادة تسجيل المادة بنجاح",
                enrollment: restored.rows[0]
            });
        }

        const enrollment = await db.query(
            `INSERT INTO public.enrollments
            (student_id, subject_id, status)
            VALUES ($1, $2, 'active')
            RETURNING *`,
            [studentId, subject_id]
        );

        res.status(201).json({
            message: "تم التسجيل في المادة بنجاح",
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
// تعديل المادة للطالب
// ممنوع للطالب
// ============================================

router.put("/:id", authMiddleware, async (req, res) => {
    return res.status(403).json({
        error: "تعديل بيانات المادة متاح للمدير فقط"
    });
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
             AND status = 'active'
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
