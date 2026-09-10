const express = require("express");
const router = express.Router();
const db = require("../db");


// ===============================
// عرض كل الطلاب
// ===============================

router.get("/", async (req, res) => {
    try {

        const result = await db.query(
            "SELECT * FROM public.students"
        );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Database error"
        });

    }
});


// ===============================
// عرض طالب واحد حسب ID
// ===============================

router.get("/:id", async (req, res) => {
    try {

        const { id } = req.params;

        const result = await db.query(
            "SELECT * FROM public.students WHERE id = $1",
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


// ===============================
// إنشاء حساب جديد
// ===============================

router.post("/register", async (req, res) => {
    try {

        const {
            name,
            email,
            password,
            major,
            university,
            academic_year,
            seat_number
        } = req.body;


        // التأكد من أن البريد غير مستخدم

        const existingStudent = await db.query(
            "SELECT id FROM public.students WHERE email = $1",
            [email]
        );


        if (existingStudent.rows.length > 0) {

            return res.status(400).json({
                error: "البريد الإلكتروني مستخدم من قبل"
            });

        }


        // إنشاء الحساب

        const result = await db.query(
           ` INSERT INTO public.students
            (name, email, password, major, university, academic_year, seat_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email, major, university, academic_year, seat_number`,
            [
                name,
                email,
                password,
                major,
                university,
                academic_year,
                seat_number
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


// ===============================
// تسجيل الدخول
// ===============================

router.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body;


        const result = await db.query(
            `SELECT id, name, email, major, university, academic_year, seat_number
             FROM public.students
             WHERE email = $1 AND password = $2`,
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


// ===============================
// تغيير كلمة المرور
// ===============================

router.put("/reset-password", async (req, res) => {
    try {

        const {
            email,
            newPassword
        } = req.body;


        // التأكد من وجود البريد

        const student = await db.query(
            "SELECT id FROM public.students WHERE email = $1",
            [email]
        );


        if (student.rows.length === 0) {
           return res.status(404).json({
                error: "البريد الإلكتروني غير موجود"
            });

        }


        // تغيير كلمة المرور

        await db.query(
            `UPDATE public.students
             SET password = $1
             WHERE email = $2`,
            [
                newPassword,
                email
            ]
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


// ===============================
// إضافة طالب جديد
// ===============================

router.post("/", async (req, res) => {
    try {

        const {
            name,
            email,
            password,
            photo,
            major,
            university,
            academic_year,
            seat_number
        } = req.body;


        const result = await db.query(
            `INSERT INTO public.students
            (name, email, password, photo, major, university, academic_year, seat_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                name,
                email,
                password,
                photo,
                major,
                university,
                academic_year,
                seat_number
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


// ===============================
// تعديل بيانات طالب
// ===============================

router.put("/:id", async (req, res) => {
    try {

        const { id } = req.params;

        const {
            name,
            email,
            password,
            photo,
            major,
            university,
            academic_year,
            seat_number
        } = req.body;


        const result = await db.query(
           ` UPDATE public.students
             SET name = $1,
                 email = $2,
                 password = $3,
                 photo = $4,
                 major = $5,
                 university = $6,
                 academic_year = $7,
                 seat_number = $8
             WHERE id = $9
             RETURNING *`,
            [
                name,
                email,
                password,
                photo,
                major,
                university,
                academic_year,
                seat_number,
                id
            ]
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


// ===============================
// حذف طالب
// ===============================

router.delete("/:id", async (req, res) => {
    try {

        const { id } = req.params;


        const result = await db.query(
            "DELETE FROM public.students WHERE id = $1 RETURNING *",
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