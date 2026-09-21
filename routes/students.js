const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;

function createToken(student) {
    return jwt.sign(
        {
            id: student.id,
            student_id: student.student_id,
            email: student.email,
            role: student.role || "student"
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            error: "غير مسموح لك بهذا الإجراء"
        });
    }

    next();
}


// ============================================
// عرض بيانات الطالب الحالي فقط
// GET /students/me
// ============================================
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year,
                role
             FROM public.students
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /students/me error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// عرض طالب واحد - الطالب يشوف بياناته فقط
// GET /students/:id
// ============================================
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (String(req.user.id) !== String(id) && req.user.role !== "admin") {
            return res.status(403).json({
                error: "غير مسموح لك بعرض بيانات هذا الطالب"
            });
        }

        const result = await db.query(
            `SELECT
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year,
                role
             FROM public.students
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /students/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// تسجيل طالب جديد
// POST /students/register
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

        if (!email) {
            return res.status(400).json({
                error: "البريد الإلكتروني مطلوب"
            });
        }

        if (!password) {
            return res.status(400).json({
                error: "كلمة المرور مطلوبة"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
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

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await db.query(
            `INSERT INTO public.students
            (
                student_id,
                name,
                email,
                password,
                major,
                university,
                academic_year,
                role
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'student')
            RETURNING
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year,
                role`,
            [
                student_id,
                name,
                email,
                hashedPassword,
                major,
                university,
                academic_year
            ]
        );

        const student = result.rows[0];
        const token = createToken(student);

        res.status(201).json({
            message: "تم إنشاء الحساب بنجاح",
            token,
            student
        });

    } catch (error) {
        console.error("POST /students/register error:", error);

        res.status(500).json({
            error: "حدث خطأ في إنشاء الحساب"
        });
    }
});


// ============================================
// تسجيل الدخول
// POST /students/login
// ============================================
router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "الإيميل وكلمة المرور مطلوبان"
            });
        }

        const result = await db.query(
            `SELECT
                id,
                student_id,
                name,
                email,
                password,
                major,
                university,
                academic_year,
                role
             FROM public.students
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "الإيميل أو كلمة المرور غير صحيحة"
            });
        }

        const student = result.rows[0];

        let passwordCorrect = false;

        // الحسابات الجديدة تكون مشفرة بـ bcrypt
        if (
            typeof student.password === "string" &&
            student.password.startsWith("$2")
        ) {
            passwordCorrect = await bcrypt.compare(
                password,
                student.password
            );
        } else {
            // دعم الحسابات القديمة مؤقتًا
            // وبعد نجاح الدخول نحول كلمة السر إلى bcrypt
            passwordCorrect = password === student.password;

            if (passwordCorrect) {
                const hashedPassword = await bcrypt.hash(password, 12);

                await db.query(
                    `UPDATE public.students
                     SET password = $1
                     WHERE id = $2`,
                    [hashedPassword, student.id]
                );
            }
        }

        if (!passwordCorrect) {
            return res.status(401).json({
                error: "الإيميل أو كلمة المرور غير صحيحة"
            });
        }

        delete student.password;

        const token = createToken(student);

        res.json({
            message: "تم تسجيل الدخول بنجاح",
            token,
            student
        });

    } catch (error) {
        console.error("POST /students/login error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// تغيير كلمة المرور للطالب الحالي
// PUT /students/reset-password
// ============================================
router.put("/reset-password", authMiddleware, async (req, res) => {
    try {
        const {
            currentPassword,
            newPassword
        } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: "كلمة المرور الحالية والجديدة مطلوبتان"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
            });
        }

        const result = await db.query(
            `SELECT id, password
             FROM public.students
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        const student = result.rows[0];

        let passwordCorrect = false;

        if (
            typeof student.password === "string" &&
            student.password.startsWith("$2")
        ) {
            passwordCorrect = await bcrypt.compare(
                currentPassword,
                student.password
            );
        } else {
            passwordCorrect = currentPassword === student.password;
        }

        if (!passwordCorrect) {
            return res.status(401).json({
                error: "كلمة المرور الحالية غير صحيحة"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.query(
            `UPDATE public.students
             SET password = $1
             WHERE id = $2`,
            [hashedPassword, req.user.id]
        );

        res.json({
            message: "تم تغيير كلمة المرور بنجاح"
        });

    } catch (error) {
        console.error("PUT /students/reset-password error:", error);

        res.status(500).json({
            error: "حدث خطأ في تغيير كلمة المرور"
        });
    }
});


// ============================================
// عرض كل الطلاب - للإدارة فقط
// GET /students
// ============================================
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year,
                role
             FROM public.students
             ORDER BY name`
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET /students error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// إضافة طالب من لوحة الإدارة
// POST /students
// ============================================
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            major,
            university,
            academic_year,
            student_id,
            role
        } = req.body;

        if (!student_id) {
            return res.status(400).json({
                error: "رقم الطالب مطلوب"
            });
        }

        if (!email) {
            return res.status(400).json({
                error: "البريد الإلكتروني مطلوب"
            });
        }

        if (!password) {
            return res.status(400).json({
                error: "كلمة المرور مطلوبة"
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

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await db.query(
            `INSERT INTO public.students
            (
                student_id,
                name,
                email,
                password,
                major,
                university,
                academic_year,
                role
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                id,
                student_id,
                name,
                email,
                major,
                university,
                academic_year,
                role`,
            [
                student_id,
                name,
                email,
                hashedPassword,
                major,
                university,
                academic_year,
                role || "student"
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("POST /students admin error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// تعديل بيانات طالب - للإدارة فقط
// PUT /students/:id
// ============================================
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            email,
            password,
            major,
            university,
            academic_year,
            role
        } = req.body;

        let result;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 12);

            result = await db.query(
                `UPDATE public.students
                 SET
                    name = $1,
                    email = $2,
                    password = $3,
                    major = $4,
                    university = $5,
                    academic_year = $6,
                    role = COALESCE($7, role)
                 WHERE id = $8
                 RETURNING
                    id,
                    student_id,
                    name,
                    email,
                    major,
                    university,
                    academic_year,
                    role`,
                [
                    name,
                    email,
                    hashedPassword,
                    major,
                    university,
                    academic_year,
                    role,
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
                    academic_year = $5,
                    role = COALESCE($6, role)
                 WHERE id = $7
                 RETURNING
                    id,
                    student_id,
                    name,
                    email,
                    major,
                    university,
                    academic_year,
                    role`,
                [
                    name,
                    email,
                    major,
                    university,
                    academic_year,
                    role,
                    id
                ]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("PUT /students/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


// ============================================
// حذف طالب - للإدارة فقط
// DELETE /students/:id
// ============================================
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
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
                academic_year,
                role`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "الطالب غير موجود"
            });
        }

        res.json({
            message: "تم حذف الطالب بنجاح",
            student: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE /students/:id error:", error);

        res.status(500).json({
            error: "Database error"
        });
    }
});


module.exports = router;
