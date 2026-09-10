const examsList = document.getElementById("examsList");

const student = JSON.parse(localStorage.getItem("student"));

if (!student) {
    window.location.href = "index.html";
} else {

    fetch(`/exams?student_id=${student.id}`)
        .then(response => response.json())

        .then(exams => {

            examsList.innerHTML = "";

            if (exams.length === 0) {

                examsList.innerHTML =
                    "<p>مافيش امتحانات حالياً.</p>";

                return;
            }

            exams.forEach(exam => {

                const card = document.createElement("div");

                card.className = "dashboard-card";

                card.style.marginBottom = "20px";

                card.innerHTML =` 
                    <h3>
                        ${exam.title}
                    </h3>

                    <p>
                        📚 المادة:
                        ${exam.subject_name}
                    </p>

                    <p>
                        📅 التاريخ:
                        ${exam.exam_date}
                    </p>

                    <p>
                        🕐 الوقت:
                        ${exam.start_time}
                    </p>

                    <p>
                        📍 القاعة:
                        ${exam.room}
                    </p>

                    <p>
                        ${exam.description || ""}
                    </p>
                ;`

                examsList.appendChild(card);

            });

        })

        .catch(error => {

            console.error(error);

            examsList.innerHTML =
                "<p>حدث خطأ في تحميل الامتحانات.</p>";

        });
}