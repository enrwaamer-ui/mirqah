
const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");


// =====================================
// التحقق من صلاحية Admin
// =====================================

function adminOnly(req, res, next) {

    if (!req.user || req.user.role !== "admin") {

        return res.status(403).json({
            error: "ليس لديك صلاحية الإدارة"
        });

    }

    next();
}


// ==================================================
// ===================== ADMIN ======================
// ==================================================


// =====================================
// Admin - جلب جميع تسجيلات الطلاب
// =====================================

router.get(
    "/admin/all",
    authMiddleware,
    adminOnly,
    async (req, res) => {

        try {

            const result = await db.query(
                `SELECT
                    enrollments.id,
                    enrollments.student_id AS student_db_id,
                    enrollments.subject_id,
                    enrollments.status,
                    enrollments.created_at,

                    students.name AS student_name,
                    students.student_id AS student_number,

                    subjects.name AS subject_name,
                    subjects.code AS subject_code

                 FROM public.enrollments

                 JOIN public.students
                    ON enrollments.student_id = students.id

                 JOIN public.subjects
                    ON enrollments.subject_id = subjects.id

                 ORDER BY
                    students.name,
                    subjects.name`
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "GET /enrollments/admin/all error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


// =====================================
// Admin - تسجيل طالب في مادة
// =====================================

router.post(
    "/admin",
    authMiddleware,
    adminOnly,
    async (req, res) => {

        try {

            const {
                student_id,
                subject_id,
                status
            } = req.body;


            if (!student_id) {

                return res.status(400).json({
                    error: "رقم الطالب مطلوب"
                });

            }


            if (!subject_id) {

                return res.status(400).json({
                    error: "رقم المادة مطلوب"
                });

            }


            // -----------------------------
            // التأكد من وجود الطالب
            // -----------------------------

            const student = await db.query(
                `SELECT
                    id,
                    name,
                    student_id
                 FROM public.students
                 WHERE id = $1`,
                [student_id]
            );


            if (student.rows.length === 0) {

                return res.status(404).json({
                    error: "الطالب غير موجود"
                });

            }


            // -----------------------------
            // التأكد من وجود المادة
            // -----------------------------

            const subject = await db.query(
                `SELECT
                    id,
                    name,
                    code
                 FROM public.subjects
                 WHERE id = $1`,
                [subject_id]
            );


            if (subject.rows.length === 0) {

                return res.status(404).json({
                    error: "المادة غير موجودة"
                });

            }


            // -----------------------------
            // تحديد حالة التسجيل
            // -----------------------------

            const enrollmentStatus =
                status === "inactive"
                    ? "inactive"
                    : "active";


            // -----------------------------
            // البحث عن تسجيل سابق
            // -----------------------------

            const existing = await db.query(
                `SELECT
                    id,
                    status
                 FROM public.enrollments
                 WHERE student_id = $1
                 AND subject_id = $2`,
                [
                    student_id,
                    subject_id
                ]
            );


            // =====================================
            // التسجيل موجود مسبقاً
            // =====================================

            if (existing.rows.length > 0) {

                const updated = await db.query(
                    `UPDATE public.enrollments

                     SET status = $1

                     WHERE id = $2

                     RETURNING *`,
                    [
                        enrollmentStatus,
                        existing.rows[0].id
                    ]
                );


                return res.json({

                    message:
                        enrollmentStatus === "active"
                            ? "تم تسجيل الطالب في المادة بنجاح"
                            : "تم إلغاء تسجيل الطالب في المادة",

                    enrollment:
                        updated.rows[0]

                });

            }


            // =====================================
            // إنشاء تسجيل جديد
            // =====================================

            const result = await db.query(
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
                    $3
                )
                RETURNING *`,
                [
                    student_id,
                    subject_id,
                    enrollmentStatus
                ]
            );


            res.status(201).json({

                message:
                    "تم تسجيل الطالب في المادة بنجاح",

                enrollment:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "POST /enrollments/admin error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


// =====================================
// Admin - إلغاء تسجيل
// =====================================

router.delete(
    "/admin/:id",
    authMiddleware,
    adminOnly,
    async (req, res) => {

        try {

            const { id } = req.params;


            const result = await db.query(
                `UPDATE public.enrollments

                 SET status = 'inactive'

                 WHERE id = $1

                 RETURNING *`,
                [id]
            );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    error: "التسجيل غير موجود"
                });

            }


            res.json({

                message:
                    "تم إلغاء تسجيل الطالب بنجاح",

                enrollment:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "DELETE /enrollments/admin/:id error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


// ==================================================
// ===================== STUDENT ====================
// ==================================================


// =====================================
// الطالب - جلب مواده
// =====================================

router.get(
    "/",
    authMiddleware,
    async (req, res) => {

        try {

            const studentId = req.user.id;


            const result = await db.query(
                `SELECT
                    enrollments.id,
                    enrollments.student_id,
                    enrollments.subject_id,
                    enrollments.status,
                    enrollments.created_at,

                    subjects.name AS subject_name,
                    subjects.code AS subject_code

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

            console.error(
                "GET /enrollments error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


// =====================================
// الطالب - جلب تسجيل واحد
// =====================================

router.get(
    "/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const { id } = req.params;

            const studentId = req.user.id;


            const result = await db.query(
                `SELECT
                    enrollments.id,
                    enrollments.student_id,
                    enrollments.subject_id,
                    enrollments.status,
                    enrollments.created_at,

                    subjects.name AS subject_name,
                    subjects.code AS subject_code

                 FROM public.enrollments

                 JOIN public.subjects
                    ON enrollments.subject_id = subjects.id

                 WHERE enrollments.id = $1
                 AND enrollments.student_id = $2`,
                [
                    id,
                    studentId
                ]
            );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    error:
                        "التسجيل غير موجود أو لا يخص حسابك"
                });

            }


            res.json(result.rows[0]);


        } catch (error) {

            console.error(
                "GET /enrollments/:id error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


// =====================================
// الطالب - التسجيل في مادة
// =====================================

router.post(
    "/",
    authMiddleware,
    async (req, res) => {

        try {

            const { subject_id } = req.body;

            const studentId = req.user.id;


            if (!subject_id) {

                return res.status(400).json({
                    error: "رقم المادة مطلوب"
                });

            }


            // -----------------------------
            // التأكد من وجود المادة
            // -----------------------------

            const subject = await db.query(
                `SELECT
                    id,
                    name,
                    code

                 FROM public.subjects

                 WHERE id = $1`,
                [subject_id]
            );


            if (subject.rows.length === 0) {

                return res.status(404).json({
                    error: "المادة غير موجودة"
                });

            }


            // -----------------------------
            // البحث عن تسجيل سابق
            // -----------------------------

            const existing = await db.query(
                `SELECT
                    id,
                    status

                 FROM public.enrollments

                 WHERE student_id = $1
                 AND subject_id = $2`,
                [
                    studentId,
                    subject_id
                ]
            );


            // =====================================
            // يوجد تسجيل سابق
            // =====================================

            if (existing.rows.length > 0) {

                if (
                    existing.rows[0].status ===
                    "active"
                ) {

                    return res.status(400).json({
                        error:
                            "أنت مسجل في هذه المادة بالفعل"
                    });

                }


                // إعادة تفعيل التسجيل

                const restored = await db.query(
                    `UPDATE public.enrollments

                     SET status = 'active'

                     WHERE id = $1

                     RETURNING *`,
                    [
                        existing.rows[0].id
                    ]
                );


                return res.status(201).json({

                    message:
                        "تمت إعادة تسجيل المادة بنجاح",

                    enrollment:
                        restored.rows[0]

                });

            }


            // =====================================
            // تسجيل جديد
            // =====================================

            const result = await db.query(
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
                [
                    studentId,
                    subject_id
                ]
            );


            res.status(201).json({

                message:
                    "تم التسجيل في المادة بنجاح",

                enrollment:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "POST /enrollments error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


// =====================================
// الطالب - إلغاء التسجيل
// =====================================

router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const { id } = req.params;

            const studentId = req.user.id;


            const result = await db.query(
                `UPDATE public.enrollments

                 SET status = 'inactive'

                 WHERE id = $1
                 AND student_id = $2

                 RETURNING *`,
                [
                    id,
                    studentId
                ]
            );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    error:
                        "التسجيل غير موجود أو لا يخص حسابك"
                });

            }


            res.json({

                message:
                    "تم إلغاء التسجيل من المادة",

                enrollment:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "DELETE /enrollments/:id error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


module.exports = router;
