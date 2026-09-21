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


// =====================================================
// ADMIN
// =====================================================


// ============================================
// عرض جميع المواد للإدارة
// GET /subjects/admin/all
// ============================================

router.get(
    "/admin/all",
    authMiddleware,
    adminOnly,
    async (req, res) => {

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

            console.error(
                "GET /subjects/admin/all error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });
        }
    }
);


// ============================================
// إضافة مادة من الإدارة
// POST /subjects/admin
// ============================================

router.post(
    "/admin",
    authMiddleware,
    adminOnly,
    async (req, res) => {

        try {

            const {
                name,
                code
            } = req.body;

            if (!name || !code) {

                return res.status(400).json({
                    error: "اسم المادة وكود المادة مطلوبان"
                });
            }

            const existing = await db.query(
                `SELECT id, name, code
                 FROM public.subjects
                 WHERE code = $1`,
                [code]
            );

            if (existing.rows.length > 0) {

                return res.status(400).json({
                    error: "رمز المادة موجود بالفعل"
                });
            }

            const result = await db.query(
                `INSERT INTO public.subjects
                (
                    name,
                    code
                )
                VALUES ($1, $2)
                RETURNING id, name, code, created_at`,
                [name, code]
            );

            res.status(201).json({
                message: "تمت إضافة المادة بنجاح",
                subject: result.rows[0]
            });

        } catch (error) {

            console.error(
                "POST /subjects/admin error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });
        }
    }
);


// ============================================
// حذف مادة من الإدارة
// DELETE /subjects/admin/:id
// ============================================

router.delete(
    "/admin/:id",
    authMiddleware,
    adminOnly,
    async (req, res) => {

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

            console.error(
                "DELETE /subjects/admin/:id error:",
                error
            );

            res.status(500).json({
                error: "لا يمكن حذف المادة لأنها مرتبطة ببيانات أخرى أو حدث خطأ في قاعدة البيانات"
            });
        }
    }
);


module.exports = router;
