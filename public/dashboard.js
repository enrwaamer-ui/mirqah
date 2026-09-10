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


    // المحاضرة القادمة
    fetch(`/lectures/next?student_id=${student.id}`)
        .then(response => response.json())
        .then(lecture => {

            const nextLecture =
                document.getElementById("nextLecture");

            if (!lecture) {

                nextLecture.innerHTML =
                    "<p>مافيش محاضرات قادمة حاليًا.</p>";

                return;
            }

            nextLecture.innerHTML = `
                <h3>${lecture.title}</h3>

                <p>
                    📚 المادة:
                    ${lecture.subject_name}
                </p>

                <p>
                    📅 التاريخ:
                    ${lecture.lecture_date}
                </p>

                <p>
                    🕐 الوقت:
                    ${lecture.start_time} -
                    ${lecture.end_time}
                </p>

                <p>
                    📍 القاعة:
                    ${lecture.room}
                </p>
           ` ;

        })
        .catch(error => {

            console.error(error);

            document.getElementById("nextLecture").innerHTML =
                "<p>حدث خطأ في تحميل المحاضرة القادمة.</p>";

        });

}



// تسجيل الخروج
function logout() {

    localStorage.removeItem("student");

    window.location.href = "index.html";

}