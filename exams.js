const examsList = document.getElementById("examsList");


fetch("/exams")

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


            card.innerHTML = `

                <h3>
                    ${exam.title}
                </h3>

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
                    📚 رقم المادة:
                    ${exam.subject_id}
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