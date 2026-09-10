const studentData = localStorage.getItem("student");


if (!studentData) {

    window.location.href = "index.html";

} else {

    const student = JSON.parse(studentData);

    const subjectsList =
        document.getElementById("subjectsList");


    fetch(`/subjects?student_id=${student.id}`)

        .then(response => response.json())

        .then(data => {

            if (data.length === 0) {

                subjectsList.innerHTML =
                    "<p>مافيش مواد مسجّل فيها حاليًا.</p>";

                return;
            }


            subjectsList.innerHTML = "";


            data.forEach(subject => {

                const card =
                    document.createElement("div");

                card.className = "dashboard-card";

                card.style.marginBottom = "15px";
                card.style.textAlign = "right";


                card.innerHTML = `

                    <h2>
                        📚 ${subject.name}
                    </h2>

                    <p style="font-size: 16px;">
                        🔢 كود المادة:
                        ${subject.code}
                    </p>

                    <p style="font-size: 16px;">
                        ⏱️ الساعات:
                        ${subject.credit_hours}
                    </p>

                `;


                subjectsList.appendChild(card);

            });

        })

        .catch(error => {

            console.error(error);

            subjectsList.innerHTML =
                "<p>حدث خطأ في تحميل المواد.</p>";

        });

}


function goBack() {

    window.location.href = "dashboard.html";

}