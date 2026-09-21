const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

const examsList = document.getElementById("examsList");

async function loadExams() {
    try {
        const response = await fetch("/exams", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ في تحميل الامتحانات");
        }

        if (!data || data.length === 0) {
            examsList.innerHTML = `
                <p style="text-align:center;">
                    مافيش امتحانات مسجلة حاليًا.
                </p>
            `;
            return;
        }

        examsList.innerHTML = "";

        data.forEach(exam => {
            const card = document.createElement("div");

            card.className = "dashboard-card";
            card.style.marginBottom = "15px";
            card.style.textAlign = "right";

            card.innerHTML = `
                <h2>📝 ${exam.subject_display_name || exam.subject_name || "بدون مادة"}</h2>

                <p>
                    📅 التاريخ:
                    ${formatDate(exam.exam_date)}
                </p>

                <p>
                    ⏰ الوقت:
                    ${formatTime(exam.start_time)}
                </p>

                <p>
                    🏫 القاعة:
                    ${exam.hall || "غير محددة"}
                </p>

                <p>
                    🔢 كود المادة:
                    ${exam.subject_code || "غير محدد"}
                </p>
            `;

            examsList.appendChild(card);
        });

    } catch (error) {
        console.error("Exams error:", error);

        examsList.innerHTML = `
            <p style="text-align:center;">
                ${error.message}
            </p>
        `;
    }
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "غير محدد";
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString("ar-LY", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function formatTime(timeValue) {
    if (!timeValue) {
        return "غير محدد";
    }

    const parts = String(timeValue).split(":");

    if (parts.length < 2) {
        return timeValue;
    }

    const hour = Number(parts[0]);
    const minute = parts[1];

    if (isNaN(hour)) {
        return timeValue;
    }

    const period = hour >= 12 ? "م" : "ص";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${period}`;
}

function goBack() {
    window.location.href = "dashboard.html";
}

loadExams();
