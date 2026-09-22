const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

const addLectureForm = document.getElementById("addLectureForm");
const subjectSelect = document.getElementById("subjectId");
const lectureMessage = document.getElementById("lectureMessage");
const scheduleBody = document.getElementById("scheduleBody");
const weekTitle = document.getElementById("weekTitle");

const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const todayBtn = document.getElementById("todayBtn");

let lectures = [];
let currentWeekDate = new Date();


// =====================================
// تسجيل الخروج
// =====================================
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("student");
    window.location.href = "index.html";
}


// =====================================
// الهروب من HTML
// =====================================
function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =====================================
// تحميل المواد
// =====================================
async function loadSubjects() {
    try {

        subjectSelect.innerHTML = `
            <option value="">جاري تحميل المواد...</option>
        `;

        const response = await fetch("/subjects", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "فشل تحميل المواد");
        }

        subjectSelect.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {

            subjectSelect.innerHTML = `
                <option value="">
                    مافيش مواد عندك — أضيفي مادة أولاً
                </option>
            `;

            return;
        }

        const firstOption = document.createElement("option");
        firstOption.value = "";
        firstOption.textContent = "اختر المادة";
        subjectSelect.appendChild(firstOption);

        data.forEach(subject => {

            const option = document.createElement("option");

            option.value = subject.id;

            option.textContent = subject.code
                ? `${subject.name} - ${subject.code}`
                : subject.name;

            subjectSelect.appendChild(option);
        });

    } catch (error) {

        console.error("loadSubjects error:", error);

        subjectSelect.innerHTML = `
            <option value="">
                فشل تحميل المواد
            </option>
        `;
    }
}


// =====================================
// التاريخ YYYY-MM-DD
// =====================================
function getDateKey(value) {

    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
}


// =====================================
// تحويل التاريخ إلى Date محلي
// =====================================
function parseDateOnly(value) {

    const key = getDateKey(value);

    const parts = key.split("-");

    if (parts.length !== 3) {
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    return new Date(year, month - 1, day);
}


// =====================================
// بداية الأسبوع = السبت
// =====================================
function getSaturday(date) {

    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    const day = result.getDay();

    const daysSinceSaturday = (day + 1) % 7;

    result.setDate(result.getDate() - daysSinceSaturday);

    return result;
}


// =====================================
// صيغة التاريخ
// =====================================
function formatDateShort(date) {

    return date.toLocaleDateString("ar-LY", {
        day: "2-digit",
        month: "2-digit"
    });
}


// =====================================
// صيغة نطاق الأسبوع
// =====================================
function formatWeekRange(startDate) {

    const endDate = new Date(startDate);

    endDate.setDate(endDate.getDate() + 6);

    const startText = startDate.toLocaleDateString("ar-LY", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const endText = endDate.toLocaleDateString("ar-LY", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    return `من ${startText} إلى ${endText}`;
}


// =====================================
// صيغة الوقت
// =====================================
function formatTime(value) {

    if (!value) {
        return "";
    }

    const text = String(value).slice(0, 5);

    const parts = text.split(":");

    if (parts.length < 2) {
        return text;
    }

    const hours = Number(parts[0]);
    const minutes = parts[1];

    if (Number.isNaN(hours)) {
        return text;
    }

    const suffix = hours >= 12 ? "م" : "ص";

    let hour12 = hours % 12;

    if (hour12 === 0) {
        hour12 = 12;
    }

    return `${hour12}:${minutes} ${suffix}`;
}


// =====================================
// تحويل الوقت للفرز
// =====================================
function timeToMinutes(value) {

    if (!value) {
        return 0;
    }

    const text = String(value).slice(0, 5);

    const parts = text.split(":");

    if (parts.length !== 2) {
        return 0;
    }

    return Number(parts[0]) * 60 + Number(parts[1]);
}


// =====================================
// تحويل الوقت المستخدم في Prompt
// =====================================
function formatInputTime(value) {

    if (!value) {
        return "";
    }

    return String(value).slice(0, 5);
}


// =====================================
// تحميل المحاضرات
// =====================================
async function loadLectures() {

    try {

        const response = await fetch("/lectures", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "فشل تحميل المحاضرات");
        }

        lectures = Array.isArray(data) ? data : [];

        renderSchedule();

    } catch (error) {

        console.error("loadLectures error:", error);

        scheduleBody.innerHTML = `
            <tr>
                <td colspan="8" style="padding:30px; text-align:center;">
                    حدث خطأ في تحميل المحاضرات
                </td>
            </tr>
        `;
    }
}


// =====================================
// رسم الجدول
// =====================================
function renderSchedule() {

    const weekStart = getSaturday(currentWeekDate);

    weekTitle.textContent = formatWeekRange(weekStart);

    const dayDates = {};

    for (let i = 0; i < 7; i++) {

        const date = new Date(weekStart);

        date.setDate(weekStart.getDate() + i);

        const jsDay = date.getDay();

        dayDates[jsDay] = date;

        const dateElement = document.getElementById(`date-${jsDay}`);

        if (dateElement) {
            dateElement.textContent = formatDateShort(date);
        }
    }


    // =====================================
    // ترتيب المحاضرات حسب الوقت
    // =====================================

    const weekLectures = lectures.filter(lecture => {

        const lectureDate = parseDateOnly(lecture.lecture_date);

        if (!lectureDate) {
            return false;
        }

        return lectureDate >= weekStart &&
            lectureDate <= new Date(
                weekStart.getFullYear(),
                weekStart.getMonth(),
                weekStart.getDate() + 6,
                23,
                59,
                59
            );
    });


    if (weekLectures.length === 0) {

        scheduleBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div style="padding:35px; color:#777;">
                        لا توجد محاضرات في هذا الأسبوع 📚
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    // كل الأوقات الموجودة في هذا الأسبوع
    const uniqueTimes = [
        ...new Set(
            weekLectures
                .map(lecture => formatInputTime(lecture.start_time))
                .filter(Boolean)
        )
    ].sort((a, b) => {
        return timeToMinutes(a) - timeToMinutes(b);
    });


    let html = "";


    uniqueTimes.forEach(time => {

        html += `
            <tr>

                <td class="time-column">
                    ${escapeHtml(formatTime(time))}
                </td>
        `;


        // السبت إلى الجمعة
        const orderedDays = [6, 0, 1, 2, 3, 4, 5];


        orderedDays.forEach(dayNumber => {

            const dayLectures = weekLectures.filter(lecture => {

                const lectureDate = parseDateOnly(lecture.lecture_date);

                if (!lectureDate) {
                    return false;
                }

                return lectureDate.getDay() === dayNumber &&
                    formatInputTime(lecture.start_time) === time;
            });


            if (dayLectures.length === 0) {

                html += `
                    <td>
                        <div class="empty-cell">—</div>
                    </td>
                `;

                return;
            }


            html += `<td>`;


            dayLectures.forEach(lecture => {

                const subjectName =
                    lecture.subject_name ||
                    lecture.subject ||
                    "بدون مادة";

                html += `
                    <div class="lecture-card">

                        <div class="lecture-title">
                            ${escapeHtml(lecture.title || "محاضرة")}
                        </div>

                        <div class="lecture-subject">
                            📚 ${escapeHtml(subjectName)}
                        </div>

                        <div class="lecture-time">
                            ⏰ ${escapeHtml(formatTime(lecture.start_time))}
                            ${lecture.end_time
                                ? ` - ${escapeHtml(formatTime(lecture.end_time))}`
                                : ""}
                        </div>

                        ${
                            lecture.hall
                                ? `
                                    <div class="lecture-hall">
                                        📍 ${escapeHtml(lecture.hall)}
                                    </div>
                                  `
                                : ""
                        }

                        <div class="lecture-actions">

                            <button
                                class="edit-btn"
                                onclick="editLecture(${Number(lecture.id)})"
                            >
                                تعديل
                            </button>

                            <button
                                class="delete-btn"
                                onclick="deleteLecture(${Number(lecture.id)})"
                            >
                                حذف
                            </button>

                        </div>

                    </div>
                `;
            });


            html += `</td>`;
        });


        html += `</tr>`;
    });


    scheduleBody.innerHTML = html;
}


// =====================================
// إضافة محاضرة
// =====================================
addLectureForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const subjectId = document.getElementById("subjectId").value;
    const lectureTitle =
        document.getElementById("lectureTitle").value.trim();

    const lectureDate =
        document.getElementById("lectureDate").value;

    const startTime =
        document.getElementById("startTime").value;

    const endTime =
        document.getElementById("endTime").value;

    const hall =
        document.getElementById("hall").value.trim();


    if (!subjectId || !lectureTitle || !lectureDate || !startTime || !endTime) {

        lectureMessage.textContent =
            "يرجى تعبئة كل البيانات المطلوبة";

        return;
    }


    if (endTime <= startTime) {

        lectureMessage.textContent =
            "وقت النهاية يجب أن يكون بعد وقت البداية";

        return;
    }


    lectureMessage.textContent =
        "جاري إضافة المحاضرة...";


    try {

        const response = await fetch("/lectures", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({

                subject_id: Number(subjectId),

                title: lectureTitle,

                lecture_date: lectureDate,

                start_time: startTime,

                end_time: endTime,

                hall: hall

            })
        });


        if (response.status === 401) {
            logout();
            return;
        }


        const data = await response.json();


        if (!response.ok) {

            lectureMessage.textContent =
                data.error || "فشل إضافة المحاضرة";

            return;
        }


        lectureMessage.textContent =
            "✅ تمت إضافة المحاضرة بنجاح";


        addLectureForm.reset();


        await loadSubjects();

        await loadLectures();


    } catch (error) {

        console.error("Add lecture error:", error);

        lectureMessage.textContent =
            "حدث خطأ في الاتصال بالسيرفر";
    }
});


// =====================================
// تعديل محاضرة
// =====================================
async function editLecture(id) {

    try {

        const response = await fetch(`/lectures/${id}`, {

            headers: {
                "Authorization": `Bearer ${token}`
            }
        });


        if (response.status === 401) {
            logout();
            return;
        }


        const data = await response.json();


        if (!response.ok) {

            alert(data.error || "فشل تحميل المحاضرة");

            return;
        }


        const lecture = data.lecture || data;


        const newDate = prompt(
            "تاريخ المحاضرة:",
            getDateKey(lecture.lecture_date)
        );

        if (!newDate) {
            return;
        }


        const newStartTime = prompt(
            "وقت البداية:",
            formatInputTime(lecture.start_time)
        );

        if (!newStartTime) {
            return;
        }


        const newEndTime = prompt(
            "وقت النهاية:",
            formatInputTime(lecture.end_time)
        );

        if (!newEndTime) {
            return;
        }


        const newHall = prompt(
            "القاعة:",
            lecture.hall || ""
        );


        if (newEndTime <= newStartTime) {

            alert("وقت النهاية يجب أن يكون بعد وقت البداية");

            return;
        }


        const updateResponse = await fetch(`/lectures/${id}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({

                subject_id: lecture.subject_id,

                lecture_date: newDate,

                start_time: newStartTime,

                end_time: newEndTime,

                hall: newHall

            })
        });


        if (updateResponse.status === 401) {
            logout();
            return;
        }


        const updateData = await updateResponse.json();


        if (!updateResponse.ok) {

            alert(
                updateData.error ||
                "فشل تعديل المحاضرة"
            );

            return;
        }


        await loadLectures();


    } catch (error) {

        console.error("editLecture error:", error);

        alert("حدث خطأ أثناء تعديل المحاضرة");
    }
}


// =====================================
// حذف محاضرة
// =====================================
async function deleteLecture(id) {

    const confirmed = confirm(
        "هل أنت متأكد من حذف هذه المحاضرة؟"
    );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(`/lectures/${id}`, {

            method: "DELETE",

            headers: {
                "Authorization": `Bearer ${token}`
            }
        });


        if (response.status === 401) {
            logout();
            return;
        }


        const data = await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "فشل حذف المحاضرة"
            );

            return;
        }


        await loadLectures();


    } catch (error) {

        console.error("deleteLecture error:", error);

        alert(
            "حدث خطأ أثناء حذف المحاضرة"
        );
    }
}


// =====================================
// الأسبوع السابق
// =====================================
prevWeekBtn.addEventListener("click", function () {

    currentWeekDate.setDate(
        currentWeekDate.getDate() - 7
    );

    renderSchedule();
});


// =====================================
// الأسبوع التالي
// =====================================
nextWeekBtn.addEventListener("click", function () {

    currentWeekDate.setDate(
        currentWeekDate.getDate() + 7
    );

    renderSchedule();
});


// =====================================
// الرجوع لأسبوع اليوم
// =====================================
todayBtn.addEventListener("click", function () {

    currentWeekDate = new Date();

    renderSchedule();
});


// =====================================
// تشغيل الصفحة
// =====================================
loadSubjects();
loadLectures();
