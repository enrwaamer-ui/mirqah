const studentData = localStorage.getItem("student");

if (!studentData) {

    window.location.href = "index.html";

} else {

    const student = JSON.parse(studentData);


    // اسم الطالب
    document.getElementById("studentName").textContent =
        student.name;


    // عدد المواد
    fetch(`/subjects?student_id=${student.id}`)
        .then(response => response.json())
        .then(data => {

            document.getElementById("subjectsCount").textContent =
                data.length;

        })
        .catch(error => {

            console.error(error);

        });


    // عدد المحاضرات
    fetch(`/lectures?student_id=${student.id}`)
        .then(response => response.json())
        .then(data => {

            document.getElementById("lecturesCount").textContent =
                data.length;

        })
        .catch(error => {

            console.error(error);

        });


    // عدد الامتحانات
    fetch(`/exams?student_id=${student.id}`)
        .then(response => response.json())
        .then(data => {

            document.getElementById("examsCount").textContent =
                data.length;

        })
        .catch(error => {

            console.error(error);

        });


    // عدد الإشعارات غير المقروءة
    fetch(`/notifications/count?student_id=${student.id}`)
        .then(response => response.json())
        .then(data => {

            document.getElementById("notificationsCount").textContent =
                data.count;

        })
        .catch(error => {

            console.error(error);

        });


    // =========================
    // تنسيق التاريخ
    // =========================
    function formatDate(dateValue) {

        if (!dateValue) {
            return "غير محدد";
        }

        const date = new Date(dateValue);

        if (isNaN(date.getTime())) {
            return "غير محدد";
        }

        return date.toLocaleDateString("ar-LY", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }


    // =========================
    // تنسيق الوقت
    // =========================
    function formatTime(timeValue) {

        if (!timeValue) {
            return "غير محدد";
        }

        // لو الوقت جاي بالشكل:
        // 08:00:00
        // نخليه:
        // 08:00
        const match = String(timeValue).match(/^(\d{2}):(\d{2})/);

        if (match) {
            return `${match[1]}:${match[2]}`;
        }

        return timeValue;
    }


    // =========================
    // المحاضرة القادمة
    // =========================
    fetch(`/lectures/next?student_id=${student.id}`)
        .then(response => response.json())
        .then(lecture => {

            const nextLecture =
                document.getElementById("nextLecture");


            if (!lecture || lecture.error) {

                nextLecture.innerHTML =
                    "<p>مافيش محاضرات قادمة حاليًا.</p>";

                return;
            }


            const lectureDate =
                formatDate(lecture.lecture_date);


            const startTime =
                formatTime(lecture.start_time);


            const endTime =
                formatTime(lecture.end_time);


            const hall =
                lecture.hall ||
                lecture.room ||
                "غير محددة";


            nextLecture.innerHTML = `

                <h3>
                    ${lecture.title || "محاضرة"}
                </h3>

                <p>
                    📚 المادة:
                    ${lecture.subject_name || "غير محددة"}
                </p>

                <p>
                    📅 التاريخ:
                    ${lectureDate}
                </p>

                <p>
                    🕐 الوقت:
                    ${startTime} - ${endTime}
                </p>

                <p>
                    📍 القاعة:
                    ${hall}
                </p>

            `;

        })
        .catch(error => {

            console.error(error);

            document.getElementById("nextLecture").innerHTML =
                "<p>حدث خطأ في تحميل المحاضرة القادمة.</p>";

        });

}


// =========================
// تسجيل الخروج
// =========================
function logout() {

    localStorage.removeItem("student");

    window.location.href = "index.html";

}
