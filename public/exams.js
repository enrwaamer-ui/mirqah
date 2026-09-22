
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

const addExamForm = document.getElementById("addExamForm");
const subjectSelect = document.getElementById("subjectId");
const examMessage = document.getElementById("examMessage");
const scheduleBody = document.getElementById("scheduleBody");
const weekTitle = document.getElementById("weekTitle");

const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const todayBtn = document.getElementById("todayBtn");

let exams = [];
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
// حماية HTML
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
// استخراج YYYY-MM-DD
// =====================================
function getDateKey(value) {

    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
}


// =====================================
// تحويل التاريخ
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

    return new Date(
        year,
        month - 1,
        day
    );
}


// =====================================
// بداية الأسبوع = السبت
// =====================================
function getSaturday(date) {

    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    const day = result.getDay();

    const daysSinceSaturday = (day + 1) % 7;

    result.setDate(
        result.getDate() - daysSinceSaturday
    );

    return result;
}


// =====================================
// التاريخ المختصر
// =====================================
function formatDateShort(date) {

    return date.toLocaleDateString("ar-LY", {
        day: "2-digit",
        month: "2-digit"
    });
}


// =====================================
// نطاق الأسبوع
// =====================================
function formatWeekRange(startDate) {

    const endDate = new Date(startDate);

    endDate.setDate(
        endDate.getDate() + 6
    );

    const startText = startDate.toLocaleDateString(
        "ar-LY",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

    const endText = endDate.toLocaleDateString(
        "ar-LY",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

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
// للفرز
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
// تحميل الامتحانات
// =====================================
async function loadExams() {

    try {

        const response = await fetch("/exams", {
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
            throw new Error(
                data.error || "فشل تحميل الامتحانات"
            );
        }

        exams = Array.isArray(data) ? data : [];

        renderSchedule();

    } catch (error) {

        console.error("loadExams error:", error);

        scheduleBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="padding:30px; text-align:center;"
                >
                    حدث خطأ في تحميل الامتحانات
                </td>
            </tr>
        `;
    }
}


// =====================================
// رسم جدول الامتحانات
// =====================================
function renderSchedule() {

    const weekStart = getSaturday(
        currentWeekDate
    );

    weekTitle.textContent =
        formatWeekRange(weekStart);


    // تحديث تواريخ الأيام
    for (let i = 0; i < 7; i++) {

        const date = new Date(weekStart);

        date.setDate(
            weekStart.getDate() + i
        );

        const jsDay = date.getDay();

        const dateElement =
            document.getElementById(`date-${jsDay}`);

        if (dateElement) {

            dateElement.textContent =
                formatDateShort(date);
        }
    }


    // الامتحانات الموجودة في الأسبوع الحالي
    const weekExams = exams.filter(exam => {

        const examDate =
            parseDateOnly(exam.exam_date);

        if (!examDate) {
            return false;
        }

        const weekEnd = new Date(
            weekStart.getFullYear(),
            weekStart.getMonth(),
            weekStart.getDate() + 6,
            23,
            59,
            59
        );

        return examDate >= weekStart &&
            examDate <= weekEnd;
    });


    if (weekExams.length === 0) {

        scheduleBody.innerHTML = `
            <tr>
                <td colspan="8">

                    <div
                        style="
                            padding:35px;
                            color:#777;
                            text-align:center;
                        "
                    >
                        لا توجد امتحانات في هذا الأسبوع 📝
                    </div>

                </td>
            </tr>
        `;

        return;
    }


    // الأوقات المختلفة
    const uniqueTimes = [
        ...new Set(
            weekExams
                .map(exam => String(exam.start_time || "").slice(0, 5))
                .filter(Boolean)
        )
    ].sort((a, b) => {

        return timeToMinutes(a) -
            timeToMinutes(b);

    });


    let html = "";


    uniqueTimes.forEach(time => {

        html += `
            <tr>

                <td class="time-column">
                    ${escapeHtml(formatTime(time))}
                </td>
        `;


        // ترتيب الأيام: السبت -> الجمعة
        const orderedDays = [
            6, 0, 1, 2, 3, 4, 5
        ];


        orderedDays.forEach(dayNumber => {

            const dayExams =
                weekExams.filter(exam => {

                    const examDate =
                        parseDateOnly(exam.exam_date);

                    if (!examDate) {
                        return false;
                    }

                    return examDate.getDay() === dayNumber &&
                        String(exam.start_time || "").slice(0, 5) === time;
                });


            if (dayExams.length === 0) {

                html += `
                    <td>
                        <div class="empty-cell">
                            —
                        </div>
                    </td>
                `;

                return;
            }


            html += `<td>`;


            dayExams.forEach(exam => {

                const subjectName =
                    exam.subject_name ||
                    exam.subject ||
                    "بدون مادة";


                html += `
                    <div class="exam-card">

                        <div class="exam-subject">
                            📝 ${escapeHtml(subjectName)}
                        </div>

                        <div class="exam-time">
                            ⏰ ${escapeHtml(
                                formatTime(exam.start_time)
                            )}
                        </div>

                        ${
                            exam.hall
                                ? `
                                    <div class="exam-hall">
                                        📍 ${escapeHtml(exam.hall)}
                                    </div>
                                  `
                                : ""
                        }

                        ${
                            exam.code
                                ? `
                                    <div class="exam-code">
                                        🔢 ${escapeHtml(exam.code)}
                                    </div>
                                  `
                                : ""
                        }

                        <div class="exam-actions">

                            <button
                                class="edit-btn"
                                onclick="editExam(${Number(exam.id)})"
                            >
                                تعديل
                            </button>

                            <button
                                class="delete-btn"
                                onclick="deleteExam(${Number(exam.id)})"
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
// إضافة امتحان
// =====================================
addExamForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const subjectId =
            document.getElementById("subjectId").value;

        const examDate =
            document.getElementById("examDate").value;

        const startTime =
            document.getElementById("startTime").value;

        const hall =
            document.getElementById("hall").value.trim();


        if (!subjectId ||
            !examDate ||
            !startTime) {

            examMessage.textContent =
                "يرجى تعبئة البيانات المطلوبة";

            return;
        }


        examMessage.textContent =
            "جاري إضافة الامتحان...";


        try {

            const response = await fetch(
                "/exams",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        subject_id:
                            Number(subjectId),

                        exam_date:
                            examDate,

                        start_time:
                            startTime,

                        hall:
                            hall
                    })
                }
            );


            if (response.status === 401) {
                logout();
                return;
            }


            const data =
                await response.json();


            if (!response.ok) {

                examMessage.textContent =
                    data.error ||
                    "فشل إضافة الامتحان";

                return;
            }


            examMessage.textContent =
                "✅ تمت إضافة الامتحان بنجاح";


            addExamForm.reset();


            await loadSubjects();

            await loadExams();


        } catch (error) {

            console.error(
                "Add exam error:",
                error
            );

            examMessage.textContent =
                "حدث خطأ في الاتصال بالسيرفر";
        }
    }
);


// =====================================
// تعديل امتحان
// =====================================
async function editExam(id) {

    try {

        const response = await fetch(
            `/exams/${id}`,
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        if (response.status === 401) {
            logout();
            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "فشل تحميل الامتحان"
            );

            return;
        }


        const exam =
            data.exam || data;


        const newDate = prompt(
            "تاريخ الامتحان:",
            getDateKey(exam.exam_date)
        );

        if (!newDate) {
            return;
        }


        const newStartTime = prompt(
            "وقت الامتحان:",
            String(
                exam.start_time || ""
            ).slice(0, 5)
        );

        if (!newStartTime) {
            return;
        }


        const newHall = prompt(
            "القاعة:",
            exam.hall || ""
        );


        const updateResponse =
            await fetch(
                `/exams/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        subject_id:
                            exam.subject_id,

                        exam_date:
                            newDate,

                        start_time:
                            newStartTime,

                        hall:
                            newHall
                    })
                }
            );


        if (updateResponse.status === 401) {
            logout();
            return;
        }


        const updateData =
            await updateResponse.json();


        if (!updateResponse.ok) {

            alert(
                updateData.error ||
                "فشل تعديل الامتحان"
            );

            return;
        }


        await loadExams();


    } catch (error) {

        console.error(
            "editExam error:",
            error
        );

        alert(
            "حدث خطأ أثناء تعديل الامتحان"
        );
    }
}


// =====================================
// حذف امتحان
// =====================================
async function deleteExam(id) {

    const confirmed =
        confirm(
            "هل أنت متأكد من حذف هذا الامتحان؟"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/exams/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (response.status === 401) {
            logout();
            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "فشل حذف الامتحان"
            );

            return;
        }


        await loadExams();


    } catch (error) {

        console.error(
            "deleteExam error:",
            error
        );

        alert(
            "حدث خطأ أثناء حذف الامتحان"
        );
    }
}


// =====================================
// الأسبوع السابق
// =====================================
prevWeekBtn.addEventListener(
    "click",
    function () {

        currentWeekDate.setDate(
            currentWeekDate.getDate() - 7
        );

        renderSchedule();
    }
);


// =====================================
// الأسبوع التالي
// =====================================
nextWeekBtn.addEventListener(
    "click",
    function () {

        currentWeekDate.setDate(
            currentWeekDate.getDate() + 7
        );

        renderSchedule();
    }
);


// =====================================
// أسبوع اليوم
// =====================================
todayBtn.addEventListener(
    "click",
    function () {

        currentWeekDate =
            new Date();

        renderSchedule();
    }
);


// =====================================
// تشغيل الصفحة
// =====================================
loadSubjects();
loadExams();
