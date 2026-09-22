
const express = require("express");
const router = express.Router();

const db = require("../db");
const authMiddleware = require("../middleware/auth");


/* =========================
   التحقق من صلاحية Admin
========================= */

function adminOnly(req, res, next) {

    if (!req.user || req.user.role !== "admin") {

        return res.status(403).json({
            error: "ليس لديك صلاحية الإدارة"
        });

    }

    next();
}


/* =========================
   امتحانات الطالب الحالي
========================= */

router.get("/", authMiddleware, async (req, res) => {

    try {

        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                exams.id,
                exams.student_id,
                exams.subject_id,
                exams.subject_name,
                exams.exam_date,
                exams.start_time,
                exams.hall,
                subjects.name AS subject_display_name,
                subjects.code AS subject_code
             FROM public.exams
             LEFT JOIN public.subjects
                ON exams.subject_id = subjects.id
             WHERE exams.student_id = $1
             ORDER BY
                exams.exam_date ASC,
                exams.start_time ASC`,
            [studentId]
        );

        res.json(result.rows);

    } catch (error) {

        console.error(
            "GET /exams error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });

    }

});


/* =========================
   Admin - جميع الامتحانات
========================= */

router.get(
    "/admin/all",
    authMiddleware,
    adminOnly,
    async (req, res) => {

        try {

            const result = await db.query(
                `SELECT
                    exams.id,
                    exams.student_id,
                    exams.subject_id,
                    exams.subject_name,
                    exams.exam_date,
                    exams.start_time,
                    exams.hall,

                    students.name AS student_name,
                    students.student_id AS student_number,

                    subjects.name AS subject_display_name,
                    subjects.code AS subject_code

                 FROM public.exams

                 LEFT JOIN public.students
                    ON exams.student_id = students.id

                 LEFT JOIN public.subjects
                    ON exams.subject_id = subjects.id

                 ORDER BY
                    exams.exam_date ASC,
                    exams.start_time ASC,
                    students.name ASC`
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "GET /exams/admin/all error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


/* =========================
   امتحان واحد للطالب
========================= */

router.get("/:id", authMiddleware, async (req, res) => {

    try {

        const { id } = req.params;

        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                exams.id,
                exams.student_id,
                exams.subject_id,
                exams.subject_name,
                exams.exam_date,
                exams.start_time,
                exams.hall,
                subjects.name AS subject_display_name,
                subjects.code AS subject_code
             FROM public.exams
             LEFT JOIN public.subjects
                ON exams.subject_id = subjects.id
             WHERE exams.id = $1
             AND exams.student_id = $2`,
            [
                id,
                studentId
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "الامتحان غير موجود في حسابك"
            });

        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "GET /exams/:id error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });

    }

});


/* =========================
   إضافة امتحان للطالب
========================= */

router.post("/", authMiddleware, async (req, res) => {

    try {

        const studentId = req.user.id;

        const {
            subject_id,
            exam_date,
            start_time,
            hall
        } = req.body;


        if (
            !subject_id ||
            !exam_date ||
            !start_time
        ) {

            return res.status(400).json({
                error:
                    "المادة والتاريخ ووقت الامتحان مطلوبة"
            });

        }


        /* التأكد أن المادة تخص الطالب */

        const subject = await db.query(
            `SELECT
                id,
                name,
                code
             FROM public.subjects
             WHERE id = $1
             AND student_id = $2`,
            [
                subject_id,
                studentId
            ]
        );


        if (subject.rows.length === 0) {

            return res.status(403).json({
                error:
                    "لا يمكنك إضافة امتحان لمادة ليست ضمن موادك"
            });

        }


        const subjectName =
            subject.rows[0].name;


        /* إضافة الامتحان */

        const result = await db.query(
            `INSERT INTO public.exams
            (
                student_id,
                subject_id,
                subject_name,
                exam_date,
                start_time,
                hall
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
            )
            RETURNING *`,
            [
                studentId,
                subject_id,
                subjectName,
                exam_date,
                start_time,
                hall
                    ? String(hall).trim()
                    : null
            ]
        );


        res.status(201).json({

            message:
                "تمت إضافة الامتحان بنجاح",

            exam:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "POST /exams error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });

    }

});


/* =========================
   Admin - إضافة امتحان
========================= */

router.post(
    "/admin",
    authMiddleware,
    adminOnly,
    async (req, res) => {

        try {

            const {
                student_id,
                subject_id,
                exam_date,
                start_time,
                hall
            } = req.body;


            if (
                !student_id ||
                !subject_id ||
                !exam_date ||
                !start_time
            ) {

                return res.status(400).json({
                    error:
                        "الطالب والمادة والتاريخ والوقت مطلوبة"
                });

            }


            /* التأكد من وجود الطالب */

            const studentResult =
                await db.query(
                    `SELECT id
                     FROM public.students
                     WHERE id = $1`,
                    [student_id]
                );


            if (studentResult.rows.length === 0) {

                return res.status(404).json({
                    error: "الطالب غير موجود"
                });

            }


            /* التأكد من وجود المادة */

            const subjectResult =
                await db.query(
                    `SELECT
                        id,
                        name,
                        code
                     FROM public.subjects
                     WHERE id = $1`,
                    [subject_id]
                );


            if (subjectResult.rows.length === 0) {

                return res.status(404).json({
                    error: "المادة غير موجودة"
                });

            }


            const subjectName =
                subjectResult.rows[0].name;


            /* إضافة الامتحان */

            const result =
                await db.query(
                    `INSERT INTO public.exams
                    (
                        student_id,
                        subject_id,
                        subject_name,
                        exam_date,
                        start_time,
                        hall
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6
                    )
                    RETURNING *`,
                    [
                        student_id,
                        subject_id,
                        subjectName,
                        exam_date,
                        start_time,
                        hall
                            ? String(hall).trim()
                            : null
                    ]
                );


            res.status(201).json({

                message:
                    "تمت إضافة الامتحان للطالب بنجاح",

                exam:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "POST /exams/admin error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


/* =========================
   تعديل امتحان الطالب
========================= */

router.put("/:id", authMiddleware, async (req, res) => {

    try {

        const { id } = req.params;

        const studentId = req.user.id;

        const {
            subject_id,
            exam_date,
            start_time,
            hall
        } = req.body;


        if (
            !subject_id ||
            !exam_date ||
            !start_time
        ) {

            return res.status(400).json({
                error:
                    "المادة والتاريخ ووقت الامتحان مطلوبة"
            });

        }


        /* التأكد أن المادة تخص الطالب */

        const subject = await db.query(
            `SELECT
                id,
                name,
                code
             FROM public.subjects
             WHERE id = $1
             AND student_id = $2`,
            [
                subject_id,
                studentId
            ]
        );


        if (subject.rows.length === 0) {

            return res.status(403).json({
                error:
                    "لا يمكنك ربط الامتحان بمادة ليست ضمن موادك"
            });

        }


        const subjectName =
            subject.rows[0].name;


        /* تعديل الامتحان */

        const result = await db.query(
            `UPDATE public.exams
             SET
                subject_id = $1,
                subject_name = $2,
                exam_date = $3,
                start_time = $4,
                hall = $5
             WHERE id = $6
             AND student_id = $7
             RETURNING *`,
            [
                subject_id,
                subjectName,
                exam_date,
                start_time,
                hall
                    ? String(hall).trim()
                    : null,
                id,
                studentId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error:
                    "الامتحان غير موجود في حسابك"
            });

        }


        res.json({

            message:
                "تم تعديل الامتحان بنجاح",

            exam:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "PUT /exams/:id error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });

    }

});


/* =========================
   حذف امتحان الطالب
========================= */

router.delete("/:id", authMiddleware, async (req, res) => {

    try {

        const { id } = req.params;

        const studentId = req.user.id;


        const result = await db.query(
            `DELETE FROM public.exams
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
                    "الامتحان غير موجود في حسابك"
            });

        }


        res.json({

            message:
                "تم حذف الامتحان بنجاح",

            exam:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "DELETE /exams/:id error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });

    }

});


/* =========================
   Admin - حذف امتحان
========================= */

router.delete(
    "/admin/:id",
    authMiddleware,
    adminOnly,
    async (req, res) => {

        try {

            const { id } = req.params;


            const result =
                await db.query(
                    `DELETE FROM public.exams
                     WHERE id = $1
                     RETURNING *`,
                    [id]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    error: "الامتحان غير موجود"
                });

            }


            res.json({

                message:
                    "تم حذف الامتحان بنجاح",

                exam:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "DELETE /exams/admin/:id error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });

        }

    }
);


module.exports = router;
