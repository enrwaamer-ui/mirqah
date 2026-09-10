const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const major = document.getElementById("major").value;
    const university = document.getElementById("university").value;
    const academic_year = document.getElementById("academic_year").value;
    const seat_number = document.getElementById("seat_number").value;

    const message = document.getElementById("registerMessage");

    try {

        const response = await fetch("/students/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                major: major,
                university: university,
                academic_year: academic_year,
                seat_number: seat_number
            })

        });


        const data = await response.json();


        if (!response.ok) {

            message.textContent = data.error;

            return;
        }


        message.textContent =
            "تم إنشاء الحساب بنجاح ✅";


        registerForm.reset();


        setTimeout(function () {

            window.location.href = "index.html";

        }, 1500);


    } catch (error) {

        console.error(error);

        message.textContent =
            "حدث خطأ في الاتصال بالسيرفر";

    }

});