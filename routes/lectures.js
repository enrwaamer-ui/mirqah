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


/* =========================
   محاضرات الطالب
========================= */

router.get("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.student_id,
                lectures.subject_id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                lectures.instructor,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             WHERE lectures.student_id = $1
             ORDER BY
                lectures.lecture_date ASC,
                lectures.start_time ASC`,
            [studentId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /lectures error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   محاضرات الأدمن
========================= */

router.get("/admin/all", authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.student_id,
                lectures.subject_id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                lectures.instructor,
                subjects.name AS subject_name,
                subjects.code AS subject_code,
                students.name AS student_name,
                students.student_id AS student_number
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             LEFT JOIN public.students
                ON lectures.student_id = students.id
             ORDER BY
                lectures.lecture_date ASC,
                lectures.start_time ASC`
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /lectures/admin/all error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   المحاضرة القادمة
========================= */

router.get("/next", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.student_id,
                lectures.subject_id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             WHERE lectures.student_id = $1
             AND (
                 lectures.lecture_date > CURRENT_DATE
                 OR (
                     lectures.lecture_date = CURRENT_DATE
                     AND lectures.start_time >= CURRENT_TIME
                 )
             )
             ORDER BY
                lectures.lecture_date ASC,
                lectures.start_time ASC
             LIMIT 1`,
            [studentId]
        );

        if (result.rows.length === 0) {
            return res.json(null);
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /lectures/next error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   محاضرة واحدة للطالب
========================= */

router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `SELECT
                lectures.id,
                lectures.student_id,
                lectures.subject_id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                lectures.end_time,
                lectures.hall,
                lectures.instructor,
                subjects.name AS subject_name,
                subjects.code AS subject_code
             FROM public.lectures
             LEFT JOIN public.subjects
                ON lectures.subject_id = subjects.id
             WHERE lectures.id = $1
             AND lectures.student_id = $2`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة في حسابك"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /lectures/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   إضافة محاضرة للطالب
========================= */

router.post("/", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;

        const {
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall,
            instructor
        } = req.body;

        if (
            !subject_id ||
            !title ||
            !lecture_date ||
            !start_time ||
            !end_time
        ) {
            return res.status(400).json({
                error: "المادة واسم المحاضرة والتاريخ ووقت البداية والنهاية مطلوبة"
            });
        }

        const subject = await db.query(
            `SELECT
                id,
                name,
                code
             FROM public.subjects
             WHERE id = $1
             AND student_id = $2`,
            [subject_id, studentId]
        );

        if (subject.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك إضافة محاضرة لمادة ليست ضمن موادك"
            });
        }

        const result = await db.query(
            `INSERT INTO public.lectures
                (
                    student_id,
                    subject_id,
                    title,
                    lecture_date,
                    start_time,
                    end_time,
                    hall,
                    instructor,
                    subject_name
                )
             VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9
                )
             RETURNING
                id,
                student_id,
                subject_id,
                title,
                lecture_date,
                start_time,
                end_time,
                hall,
                instructor,
                subject_name`,
            [
                studentId,
                subject_id,
                String(title).trim(),
                lecture_date,
                start_time,
                end_time,
                hall ? String(hall).trim() : null,
                instructor ? String(instructor).trim() : null,
                subject.rows[0].name
            ]
        );

        res.status(201).json({
            message: "تمت إضافة المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("POST /lectures error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   إضافة محاضرة من الأدمن
========================= */

router.post("/admin", authMiddleware, adminOnly, async (req, res) => {
    try {
        const {
            student_id,
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall,
            instructor
        } = req.body;

        if (
            !student_id ||
            !subject_id ||
            !title ||
            !lecture_date ||
            !start_time ||
            !end_time
        ) {
            return res.status(400).json({
                error: "بيانات المحاضرة كاملة مطلوبة"
            });
        }

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

        const result = await db.query(
            `INSERT INTO public.lectures
                (
                    student_id,
                    subject_id,
                    title,
                    lecture_date,
                    start_time,
                    end_time,
                    hall,
                    instructor,
                    subject_name
                )
             VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [
                student_id,
                subject_id,
                String(title).trim(),
                lecture_date,
                start_time,
                end_time,
                hall ? String(hall).trim() : null,
                instructor ? String(instructor).trim() : null,
                subject.rows[0].name
            ]
        );

        res.status(201).json({
            message: "تمت إضافة المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("POST /lectures/admin error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   تعديل محاضرة الطالب
========================= */

router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const {
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall,
            instructor
        } = req.body;

        if (
            !subject_id ||
            !title ||
            !lecture_date ||
            !start_time ||
            !end_time
        ) {
            return res.status(400).json({
                error: "بيانات المحاضرة كاملة مطلوبة"
            });
        }

        const subject = await db.query(
            `SELECT id, name, code
             FROM public.subjects
             WHERE id = $1
             AND student_id = $2`,
            [subject_id, studentId]
        );

        if (subject.rows.length === 0) {
            return res.status(403).json({
                error: "لا يمكنك ربط المحاضرة بمادة ليست ضمن موادك"
            });
        }

        const result = await db.query(
            `UPDATE public.lectures
             SET
                subject_id = $1,
                subject_name = $2,
                title = $3,
                lecture_date = $4,
                start_time = $5,
                end_time = $6,
                hall = $7,
                instructor = $8
             WHERE id = $9
             AND student_id = $10
             RETURNING *`,
            [
                subject_id,
                subject.rows[0].name,
                String(title).trim(),
                lecture_date,
                start_time,
                end_time,
                hall ? String(hall).trim() : null,
                instructor ? String(instructor).trim() : null,
                id,
                studentId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة في حسابك"
            });
        }

        res.json({
            message: "تم تعديل المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /lectures/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   تعديل محاضرة من الأدمن
========================= */

router.put("/admin/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            student_id,
            subject_id,
            title,
            lecture_date,
            start_time,
            end_time,
            hall,
            instructor
        } = req.body;

        if (
            !student_id ||
            !subject_id ||
            !title ||
            !lecture_date ||
            !start_time ||
            !end_time
        ) {
            return res.status(400).json({
                error: "بيانات المحاضرة كاملة مطلوبة"
            });
        }

        const subject = await db.query(
            `SELECT id, name
             FROM public.subjects
             WHERE id = $1`,
            [subject_id]
        );

        if (subject.rows.length === 0) {
            return res.status(404).json({
                error: "المادة غير موجودة"
            });
        }

        const result = await db.query(
            `UPDATE public.lectures
             SET
                student_id = $1,
                subject_id = $2,
                subject_name = $3,
                title = $4,
                lecture_date = $5,
                start_time = $6,
                end_time = $7,
                hall = $8,
                instructor = $9
             WHERE id = $10
             RETURNING *`,
            [
                student_id,
                subject_id,
                subject.rows[0].name,
                String(title).trim(),
                lecture_date,
                start_time,
                end_time,
                hall ? String(hall).trim() : null,
                instructor ? String(instructor).trim() : null,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة"
            });
        }

        res.json({
            message: "تم تعديل المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("PUT /lectures/admin/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   حذف محاضرة الطالب
========================= */

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;

        const result = await db.query(
            `DELETE FROM public.lectures
             WHERE id = $1
             AND student_id = $2
             RETURNING *`,
            [id, studentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة في حسابك"
            });
        }

        res.json({
            message: "تم حذف المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /lectures/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


/* =========================
   حذف محاضرة من الأدمن
========================= */

router.delete("/admin/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM public.lectures
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "المحاضرة غير موجودة"
            });
        }

        res.json({
            message: "تم حذف المحاضرة بنجاح",
            lecture: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /lectures/admin/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
