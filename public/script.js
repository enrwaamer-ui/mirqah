const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const message = document.getElementById("loginMessage");

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
                message.textContent = data.error;
                return;
            }

            localStorage.setItem(
                "student",
                JSON.stringify(data.student)
            );

            window.location.href = "dashboard.html";

        } catch (error) {

            console.error(error);

            message.textContent =
                "حدث خطأ في الاتصال بالسيرفر";
        }

    });

}