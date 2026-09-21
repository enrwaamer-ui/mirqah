const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("loginMessage");

        message.textContent = "جاري تسجيل الدخول...";

        try {

            const response = await fetch("/students/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                message.textContent =
                    data.error || "فشل تسجيل الدخول";
                return;
            }

            // حفظ بيانات الطالب
            localStorage.setItem(
                "student",
                JSON.stringify(data.student)
            );

            // حفظ Token الخاص بالجلسة
            localStorage.setItem(
                "token",
                data.token
            );

            // الانتقال للوحة الطالب
            window.location.href = "dashboard.html";

        } catch (error) {

            console.error("Login error:", error);

            message.textContent =
                "حدث خطأ في الاتصال بالسيرفر";
        }

    });

}
