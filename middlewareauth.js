const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET is not configured.");
}

function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "يجب تسجيل الدخول أولاً"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(401).json({
            error: "جلسة الدخول غير صالحة أو انتهت"
        });
    }
}

module.exports = authMiddleware;
