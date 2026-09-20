const express = require("express");
const router = express.Router();
const db = require("../db");


// ============================================
// عرض كل الطلاب
// ============================================
router.get("/", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year
             FROM public.students
             ORDER BY name`
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
// عرض طالب واحد
// ============================================
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year
             FROM public.students
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Student not found"
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
// تسجيل طالب جديد
// ============================================
router.post("/register", async (req, res) => {
    try {
        const {
            name,
            student_id,
            email,
            password,
            major,
            university,
            academic_year
        } = req.body;

        if (!student_id) {
            return res.status(400).json({
                error: "رقم الطالب مطلوب"
            });
        }

        const existingStudent = await db.query(
            `SELECT id
             FROM public.students
             WHERE email = $1
                OR student_id = $2`,
            [email, student_id]
        );

        if (existingStudent.rows.length > 0) {
            return res.status(400).json({
                error: "البريد الإلكتروني أو رقم الطالب مستخدم من قبل"
            });
        }

        const result = await db.query(
            `INSERT INTO public.students
            (
                student_id,
                name,
                email,
                password,
                major,
                university,
                academic_year
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year`,
            [
                student_id,
                name,
                email,
                password,
                major,
                university,
                academic_year
            ]
        );

        res.status(201).json({
            message: "تم إنشاء الحساب بنجاح",
            student: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "حدث خطأ في إنشاء الحساب"
        });
    }
});


// ============================================
// تسجيل الدخول
// ============================================
router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        const result = await db.query(
            `SELECT
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year
             FROM public.students
             WHERE email = $1
             AND password = $2`,
            [email, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "الإيميل أو كلمة المرور غير صحيحة"
            });
        }

        res.json({
            message: "Login successful",
            student: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// تغيير كلمة المرور
// ============================================
router.put("/reset-password", async (req, res) => {
    try {
        const {
            email,
            newPassword
        } = req.body;

        const student = await db.query(
            `SELECT id
             FROM public.students
             WHERE email = $1`,
            [email]
        );

        if (student.rows.length === 0) {
            return res.status(404).json({
                error: "البريد الإلكتروني غير موجود"
            });
        }

        await db.query(
            `UPDATE public.students
             SET password = $1
             WHERE email = $2`,
            [newPassword, email]
        );

        res.json({
            message: "تم تغيير كلمة المرور بنجاح"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "حدث خطأ في تغيير كلمة المرور"
        });
    }
});


// ============================================
// إضافة طالب من لوحة الإدارة
// ============================================
router.post("/", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            major,
            university,
            academic_year,
            student_id
        } = req.body;

        if (!student_id) {
            return res.status(400).json({
                error: "رقم الطالب مطلوب"
            });
        }

        const existingStudent = await db.query(
            `SELECT id
             FROM public.students
             WHERE email = $1
                OR student_id = $2`,
            [email, student_id]
        );

        if (existingStudent.rows.length > 0) {
            return res.status(400).json({
                error: "البريد الإلكتروني أو رقم الطالب مستخدم من قبل"
            });
        }

        const result = await db.query(
            `INSERT INTO public.students
            (
                student_id,
                name,
                email,
                password,
                major,
                university,
                academic_year
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year`,
            [
                student_id,
                name,
                email,
                password,
                major,
                university,
                academic_year
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
// تعديل بيانات طالب
// ============================================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            email,
            password,
            major,
            university,
            academic_year
        } = req.body;

        let result;

        if (password) {

            result = await db.query(
                `UPDATE public.students
                 SET
                    name = $1,
                    email = $2,
                    password = $3,
                    major = $4,
                    university = $5,
                    academic_year = $6
                 WHERE id = $7
                 RETURNING
                    id,
                    student_id,
                    name,
                    email,
                    major,
                    university,
                    academic_year`,
                [
                    name,
                    email,
                    password,
                    major,
                    university,
                    academic_year,
                    id
                ]
            );

        } else {

            result = await db.query(
                `UPDATE public.students
                 SET
                    name = $1,
                    email = $2,
                    major = $3,
                    university = $4,
                    academic_year = $5
                 WHERE id = $6
                 RETURNING
                    id,
                    student_id,
                    name,
                    email,
                    major,
                    university,
                    academic_year`,
                [
                    name,
                    email,
                    major,
                    university,
                    academic_year,
                    id
                ]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Student not found"
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
// حذف طالب
// ============================================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM public.students
             WHERE id = $1
             RETURNING
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Student not found"
            });
        }

        res.json({
            message: "Student deleted successfully",
            student: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
