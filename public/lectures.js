const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

const lecturesList = document.getElementById("lecturesList");

async function loadLectures() {
    try {
        const response = await fetch("/lectures", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ في تحميل المحاضرات");
        }

        if (!data || data.length === 0) {
            lecturesList.innerHTML = `
                <p style="text-align:center;">
                    مافيش محاضرات مسجلة حاليًا.
                </p>
            `;
            return;
        }

        lecturesList.innerHTML = "";

        data.forEach(lecture => {
            const card = document.createElement("div");

            card.className = "dashboard-card";
            card.style.marginBottom = "15px";
            card.style.textAlign = "right";

            card.innerHTML = `
                <h2>📚 ${lecture.subject_name || "بدون مادة"}</h2>

                <p>
                    📝 المحاضرة:
                    ${lecture.title || "غير محدد"}
                </p>

                <p>
                    📅 التاريخ:
                    ${formatDate(lecture.lecture_date)}
                </p>

                <p>
                    ⏰ الوقت:
                    ${formatTime(lecture.start_time)}
                    -
                    ${formatTime(lecture.end_time)}
                </p>

                <p>
                    🏫 القاعة:
                    ${lecture.hall || "غير محددة"}
                </p>

                <p>
                    🔢 كود المادة:
                    ${lecture.subject_code || "غير محدد"}
                </p>
            `;

            lecturesList.appendChild(card);
        });

    } catch (error) {
        console.error("Lectures error:", error);

        lecturesList.innerHTML = `
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

loadLectures();
