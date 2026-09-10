const studentData =
    localStorage.getItem("student");


if (!studentData) {

    window.location.href = "index.html";

} else {

    const student =
        JSON.parse(studentData);


    const lecturesList =
        document.getElementById("lecturesList");


    fetch(`/lectures?student_id=${student.id}`)

        .then(response => response.json())

        .then(lectures => {

            lecturesList.innerHTML = "";


            if (lectures.length === 0) {

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


                card.innerHTML = `

                    <h3>
                        ${lecture.title}
                    </h3>

                    <p>
                        📅 التاريخ:
                        ${lecture.lecture_date}
                    </p>

                    <p>
                        🕐 الوقت:
                        ${lecture.start_time}
                        -
                        ${lecture.end_time}
                    </p>

                    <p>
                        📍 القاعة:
                        ${lecture.room}
                    </p>

                    <p>
                        📚 المادة:
                        ${lecture.subject_name}
                    </p>`

                ;


                lecturesList.appendChild(card);

            });

        })

        .catch(error => {

            console.error(error);

            lecturesList.innerHTML =
                "<p>حدث خطأ في تحميل المحاضرات.</p>";

        });

}