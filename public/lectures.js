const studentData =
    localStorage.getItem("student");


if (!studentData) {

    window.location.href = "index.html";

} else {

    const student =
        JSON.parse(studentData);


    const lecturesList =
        document.getElementById("lecturesList");


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
    // تحميل المحاضرات
    // =========================
    fetch(`/lectures?student_id=${student.id}`)

        .then(response => response.json())

        .then(lectures => {

            lecturesList.innerHTML = "";


            if (!Array.isArray(lectures) || lectures.length === 0) {

                lecturesList.innerHTML =
                    "<p>مافيش محاضرات حالياً.</p>";

                return;
            }


            lectures.forEach(lecture => {

                const card =
                    document.createElement("div");


                card.className =
                    "dashboard-card";


                card.style.marginBottom =
                    "20px";


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


                const subjectName =
                    lecture.subject_name ||
                    lecture.subject_display_name ||
                    "غير محددة";


                card.innerHTML = `

                    <h3>
                        🎓 ${lecture.title || "محاضرة"}
                    </h3>

                    <p>
                        📅 التاريخ:
                        ${lectureDate}
                    </p>

                    <p>
                        🕐 الوقت:
                        ${startTime}
                        -
                        ${endTime}
                    </p>

                    <p>
                        📍 القاعة:
                        ${hall}
                    </p>

                    <p>
                        📚 المادة:
                        ${subjectName}
                    </p>

                `;


                lecturesList.appendChild(card);

            });

        })

        .catch(error => {

            console.error(error);

            lecturesList.innerHTML =
                "<p>حدث خطأ في تحميل المحاضرات.</p>";

        });

}
