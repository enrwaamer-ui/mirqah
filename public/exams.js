const examsList = document.getElementById("examsList");

const studentData = localStorage.getItem("student");

if (!studentData) {

    window.location.href = "index.html";

} else {

    const student = JSON.parse(studentData);


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

        const match =
            String(timeValue).match(/^(\d{2}):(\d{2})/);

        if (match) {
            return `${match[1]}:${match[2]}`;
        }

        return timeValue;
    }


    // =========================
    // تحميل الامتحانات
    // =========================
    fetch(`/exams?student_id=${student.id}`)

        .then(response => response.json())

        .then(exams => {

            examsList.innerHTML = "";

            if (!Array.isArray(exams) || exams.length === 0) {

                examsList.innerHTML =
                    "<p>مافيش امتحانات حالياً.</p>";

                return;
            }


            exams.forEach(exam => {

                const card =
                    document.createElement("div");

                card.className = "dashboard-card";

                card.style.marginBottom = "20px";

                const examDate =
                    formatDate(exam.exam_date);

                const examTime =
                    formatTime(exam.start_time);

                const subjectName =
                    exam.subject_display_name ||
                    exam.subject_name ||
                    "غير محددة";

                const hall =
                    exam.hall ||
                    "غير محددة";


                card.innerHTML = `

                    <h3>
                        📝 امتحان ${subjectName}
                    </h3>

                    <p>
                        📚 المادة:
                        ${subjectName}
                    </p>

                    <p>
                        📅 التاريخ:
                        ${examDate}
                    </p>

                    <p>
                        🕐 الوقت:
                        ${examTime}
                    </p>

                    <p>
                        📍 القاعة:
                        ${hall}
                    </p>

                `;


                examsList.appendChild(card);

            });

        })

        .catch(error => {

            console.error(error);

            examsList.innerHTML =
                "<p>حدث خطأ في تحميل الامتحانات.</p>";

        });
}
