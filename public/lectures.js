// =====================================
// lectures.js
// جدول المحاضرات الأسبوعي
// =====================================

const token =
    localStorage.getItem("token") ||
    (() => {
        try {
            const student = JSON.parse(
                localStorage.getItem("student") || "null"
            );

            return (
                student?.token ||
                student?.access_token ||
                ""
            );
        } catch {
            return "";
        }
    })();


// =====================================
// التحقق من تسجيل الدخول
// =====================================

if (!token) {
    window.location.href = "index.html";
}


// =====================================
// عناصر الصفحة
// =====================================

const addLectureForm =
    document.getElementById("addLectureForm");

const subjectSelect =
    document.getElementById("subjectId");

const lectureMessage =
    document.getElementById("lectureMessage");

const scheduleBody =
    document.getElementById("scheduleBody");

const weekTitle =
    document.getElementById("weekTitle");

const prevWeekBtn =
    document.getElementById("prevWeekBtn");

const nextWeekBtn =
    document.getElementById("nextWeekBtn");

const todayBtn =
    document.getElementById("todayBtn");


// =====================================
// متغيرات
// =====================================

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
// حماية النصوص
// =====================================

function escapeHtml(value) {
    if (
        value === null ||
        value === undefined
    ) {
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
// تحويل الوقت
// =====================================

function formatInputTime(time) {
    if (!time) {
        return "";
    }

    const value = String(time);

    if (value.length >= 5) {
        return value.substring(0, 5);
    }

    return value;
}


function timeToMinutes(time) {
    if (!time) {
        return 0;
    }

    const parts = String(time).split(":");

    const hours =
        Number(parts[0]) || 0;

    const minutes =
        Number(parts[1]) || 0;

    return (
        hours * 60 +
        minutes
    );
}


function formatTime(time) {
    const value =
        formatInputTime(time);

    if (!value) {
        return "";
    }

    const parts =
        value.split(":");

    let hours =
        Number(parts[0]) || 0;

    const minutes =
        Number(parts[1]) || 0;

    const period =
        hours >= 12 ? "م" : "ص";

    hours =
        hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    return (
        `${hours}:${String(minutes).padStart(2, "0")} ${period}`
    );
}


// =====================================
// تحويل اسم اليوم إلى رقم
// السبت = 6
// الأحد = 0
// الاثنين = 1
// الثلاثاء = 2
// الأربعاء = 3
// الخميس = 4
// الجمعة = 5
// =====================================

function getDayNumber(day) {

    const value =
        String(day || "")
            .trim()
            .toLowerCase();

    const days = {
        saturday: 6,
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,

        "السبت": 6,
        "الأحد": 0,
        "الاحد": 0,
        "الاثنين": 1,
        "الإثنين": 1,
        "الثلاثاء": 2,
        "الأربعاء": 3,
        "الاربعاء": 3,
        "الخميس": 4,
        "الجمعة": 5
    };

    return days[value] ?? -1;
}


// =====================================
// اسم اليوم
// =====================================

function getDayName(dayNumber) {

    const names = {
        6: "السبت",
        0: "الأحد",
        1: "الاثنين",
        2: "الثلاثاء",
        3: "الأربعاء",
        4: "الخميس",
        5: "الجمعة"
    };

    return (
        names[dayNumber] || ""
    );
}


// =====================================
// بداية الأسبوع = السبت
// =====================================

function getSaturday(date) {

    const result =
        new Date(date);

    result.setHours(
        0,
        0,
        0,
        0
    );

    const day =
        result.getDay();

    const daysSinceSaturday =
        (day + 1) % 7;

    result.setDate(
        result.getDate() -
        daysSinceSaturday
    );

    return result;
}


// =====================================
// تنسيق التاريخ
// =====================================

function formatDateShort(date) {

    return date.toLocaleDateString(
        "ar-LY",
        {
            day: "2-digit",
            month: "2-digit"
        }
    );
}


// =====================================
// تنسيق نطاق الأسبوع
// =====================================

function formatWeekRange(
    startDate
) {

    const endDate =
        new Date(startDate);

    endDate.setDate(
        endDate.getDate() + 6
    );

    return (
        `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
    );
}


// =====================================
// وضع تواريخ الأيام في رأس الجدول
// =====================================

function updateWeekDates() {

    const weekStart =
        getSaturday(
            currentWeekDate
        );

    if (weekTitle) {
        weekTitle.textContent =
            `أسبوع ${formatWeekRange(weekStart)}`;
    }

    for (let i = 0; i < 7; i++) {

        const date =
            new Date(weekStart);

        date.setDate(
            weekStart.getDate() + i
        );

        const jsDay =
            date.getDay();

        const dateElement =
            document.getElementById(
                `date-${jsDay}`
            );

        if (dateElement) {
            dateElement.textContent =
                formatDateShort(date);
        }
    }
}


// =====================================
// تحميل المواد
// =====================================

async function loadSubjects() {

    if (!subjectSelect) {
        return;
    }

    try {

        subjectSelect.innerHTML =
            `<option value="">جاري تحميل المواد...</option>`;

        const response =
            await fetch(
                "/subjects",
                {
                    method: "GET",
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
            throw new Error(
                data.error ||
                "فشل تحميل المواد"
            );
        }

        let subjects = [];

        if (Array.isArray(data)) {
            subjects = data;
        } else if (
            Array.isArray(data.subjects)
        ) {
            subjects = data.subjects;
        } else if (
            Array.isArray(data.data)
        ) {
            subjects = data.data;
        }

        subjectSelect.innerHTML = "";

        const firstOption =
            document.createElement(
                "option"
            );

        firstOption.value = "";
        firstOption.textContent =
            "اختر المادة";

        subjectSelect.appendChild(
            firstOption
        );

        if (subjects.length === 0) {

            const emptyOption =
                document.createElement(
                    "option"
                );

            emptyOption.value = "";
            emptyOption.textContent =
                "مافيش مواد عندك";

            subjectSelect.appendChild(
                emptyOption
            );

            return;
        }

        subjects.forEach(
            (subject) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    subject.id;

                option.textContent =
                    subject.code
                        ? `${subject.name} - ${subject.code}`
                        : (
                            subject.name ||
                            "بدون اسم"
                        );

                subjectSelect.appendChild(
                    option
                );
            }
        );

    } catch (error) {

        console.error(
            "loadSubjects error:",
            error
        );

        subjectSelect.innerHTML =
            `<option value="">فشل تحميل المواد</option>`;
    }
}


// =====================================
// تحميل جدول المحاضرات
// =====================================

async function loadLectures() {

    try {

        const response =
            await fetch(
                "/weekly-schedule",
                {
                    method: "GET",
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
            throw new Error(
                data.error ||
                "فشل تحميل جدول المحاضرات"
            );
        }

        if (Array.isArray(data)) {
            lectures = data;
        } else if (
            Array.isArray(data.lectures)
        ) {
            lectures =
                data.lectures;
        } else if (
            Array.isArray(data.schedules)
        ) {
            lectures =
                data.schedules;
        } else if (
            Array.isArray(data.data)
        ) {
            lectures =
                data.data;
        } else {
            lectures = [];
        }

        renderSchedule();

    } catch (error) {

        console.error(
            "loadLectures error:",
            error
        );

        if (scheduleBody) {

            scheduleBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        حدث خطأ في تحميل جدول المحاضرات
                    </td>
                </tr>
            `;
        }
    }
}


// =====================================
// رسم الجدول الأسبوعي
// =====================================

function renderSchedule() {

    if (!scheduleBody) {
        return;
    }

    updateWeekDates();

    if (
        !lectures ||
        lectures.length === 0
    ) {

        scheduleBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-cell"
                         style="padding:35px;">
                        لا توجد محاضرات في جدولك 📚
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    // الأيام بالترتيب:
    // السبت → الأحد → الاثنين → الثلاثاء
    // → الأربعاء → الخميس → الجمعة

    const orderedDays = [
        6,
        0,
        1,
        2,
        3,
        4,
        5
    ];

    // أوقات المحاضرات الموجودة

    const uniqueTimes = [
        ...new Set(
            lectures
                .map(
                    (lecture) =>
                        formatInputTime(
                            lecture.start_time
                        )
                )
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            timeToMinutes(a) -
            timeToMinutes(b)
    );

    if (uniqueTimes.length === 0) {

        scheduleBody.innerHTML = `
            <tr>
                <td colspan="8">
                    لا توجد أوقات محاضرات
                </td>
            </tr>
        `;

        return;
    }

    let html = "";

    uniqueTimes.forEach(
        (time) => {

            html += `
                <tr>

                    <td class="time-column">
                        ${escapeHtml(
                            formatTime(time)
                        )}
                    </td>
            `;

            orderedDays.forEach(
                (dayNumber) => {

                    const dayLectures =
                        lectures.filter(
                            (lecture) => {

                                const lectureDay =
                                    getDayNumber(
                                        lecture.day_of_week
                                    );

                                const lectureTime =
                                    formatInputTime(
                                        lecture.start_time
                                    );

                                return (
                                    lectureDay ===
                                    dayNumber &&
                                    lectureTime ===
                                    time
                                );
                            }
                        );

                    if (
                        dayLectures.length === 0
                    ) {

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

                    dayLectures.forEach(
                        (lecture) => {

                            const subjectName =
                                lecture.subject_name ||
                                lecture.subject ||
                                "بدون مادة";

                            const title =
                                lecture.title ||
                                lecture.lecture_title ||
                                "محاضرة";

                            const room =
                                lecture.room ||
                                lecture.hall ||
                                "";

                            html += `
                                <div class="lecture-card">

                                    <div class="lecture-title">
                                        ${escapeHtml(
                                            title
                                        )}
                                    </div>

                                    <div class="lecture-subject">
                                        📚
                                        ${escapeHtml(
                                            subjectName
                                        )}
                                    </div>

                                    <div class="lecture-time">
                                        ⏰
                                        ${escapeHtml(
                                            formatTime(
                                                lecture.start_time
                                            )
                                        )}

                                        ${
                                            lecture.end_time
                                                ? ` - ${escapeHtml(
                                                    formatTime(
                                                        lecture.end_time
                                                    )
                                                )}`
                                                : ""
                                        }
                                    </div>

                                    ${
                                        room
                                            ? `
                                                <div class="lecture-hall">
                                                    📍
                                                    ${escapeHtml(
                                                        room
                                                    )}
                                                </div>
                                            `
                                            : ""
                                    }

                                    <div class="lecture-actions">

                                        <button
                                            type="button"
                                            class="edit-btn"
                                            onclick="editLecture(${Number(
                                                lecture.id
                                            )})"
                                        >
                                            تعديل
                                        </button>

                                        <button
                                            type="button"
                                            class="delete-btn"
                                            onclick="deleteLecture(${Number(
                                                lecture.id
                                            )})"
                                        >
                                            حذف
                                        </button>

                                    </div>

                                </div>
                            `;
                        }
                    );

                    html += `</td>`;
                }
            );

            html += `</tr>`;
        }
    );

    scheduleBody.innerHTML =
        html;
}


// =====================================
// إضافة محاضرة
// =====================================

if (addLectureForm) {

    addLectureForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const subjectId =
                document.getElementById(
                    "subjectId"
                )?.value || "";

            const lectureTitle =
                document.getElementById(
                    "lectureTitle"
                )?.value.trim() || "";

            const dayOfWeek =
                document.getElementById(
                    "dayOfWeek"
                )?.value || "";

            const startTime =
                document.getElementById(
                    "startTime"
                )?.value || "";

            const endTime =
                document.getElementById(
                    "endTime"
                )?.value || "";

            const hall =
                document.getElementById(
                    "hall"
                )?.value.trim() || "";


            // ==============================
            // التحقق من البيانات
            // ==============================

            if (
                !subjectId ||
                !lectureTitle ||
                !dayOfWeek ||
                !startTime ||
                !endTime
            ) {

                lectureMessage.textContent =
                    "يرجى تعبئة كل البيانات المطلوبة";

                return;
            }


            if (
                timeToMinutes(endTime) <=
                timeToMinutes(startTime)
            ) {

                lectureMessage.textContent =
                    "وقت النهاية يجب أن يكون بعد وقت البداية";

                return;
            }


            lectureMessage.textContent =
                "جاري إضافة المحاضرة...";


            try {

                const response =
                    await fetch(
                        "/weekly-schedule",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body:
                                JSON.stringify(
                                    {
                                        subject_id:
                                            Number(
                                                subjectId
                                            ),

                                        title:
                                            lectureTitle,

                                        day_of_week:
                                            dayOfWeek,

                                        start_time:
                                            startTime,

                                        end_time:
                                            endTime,

                                        room:
                                            hall
                                    }
                                )
                        }
                    );


                if (
                    response.status === 401
                ) {

                    logout();
                    return;
                }


                const data =
                    await response.json();


                if (!response.ok) {

                    lectureMessage.textContent =
                        data.error ||
                        "فشل إضافة المحاضرة";

                    return;
                }


                lectureMessage.textContent =
                    "✅ تمت إضافة المحاضرة بنجاح";


                addLectureForm.reset();


                await loadSubjects();
                await loadLectures();

            } catch (error) {

                console.error(
                    "Add weekly lecture error:",
                    error
                );

                lectureMessage.textContent =
                    "حدث خطأ في الاتصال بالسيرفر";
            }
        }
    );
}


// =====================================
// تعديل محاضرة
// =====================================

async function editLecture(id) {

    try {

        const response =
            await fetch(
                `/weekly-schedule/${id}`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (
            response.status === 401
        ) {

            logout();
            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "فشل تحميل المحاضرة"
            );

            return;
        }


        const lecture =
            data.lecture ||
            data;


        // ==============================
        // اليوم
        // ==============================

        const newDay =
            prompt(
                "اكتبي يوم الأسبوع:\nSaturday / Sunday / Monday / Tuesday / Wednesday / Thursday / Friday",
                lecture.day_of_week || ""
            );


        if (!newDay) {
            return;
        }


        // ==============================
        // وقت البداية
        // ==============================

        const newStartTime =
            prompt(
                "وقت البداية:",
                formatInputTime(
                    lecture.start_time
                )
            );


        if (!newStartTime) {
            return;
        }


        // ==============================
        // وقت النهاية
        // ==============================

        const newEndTime =
            prompt(
                "وقت النهاية:",
                formatInputTime(
                    lecture.end_time
                )
            );


        if (!newEndTime) {
            return;
        }


        if (
            timeToMinutes(
                newEndTime
            ) <=
            timeToMinutes(
                newStartTime
            )
        ) {

            alert(
                "وقت النهاية يجب أن يكون بعد وقت البداية"
            );

            return;
        }


        // ==============================
        // القاعة
        // ==============================

        const newHall =
            prompt(
                "القاعة:",
                lecture.room ||
                lecture.hall ||
                ""
            );


        // ==============================
        // إرسال التعديل
        // ==============================

        const updateResponse =
            await fetch(
                `/weekly-schedule/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify(
                            {
                                subject_id:
                                    Number(
                                        lecture.subject_id
                                    ),

                                title:
                                    lecture.title ||
                                    "محاضرة",

                                day_of_week:
                                    newDay,

                                start_time:
                                    newStartTime,

                                end_time:
                                    newEndTime,

                                room:
                                    newHall
                            }
                        )
                }
            );


        if (
            updateResponse.status === 401
        ) {

            logout();
            return;
        }


        const updateData =
            await updateResponse.json();


        if (
            !updateResponse.ok
        ) {

            alert(
                updateData.error ||
                "فشل تعديل المحاضرة"
            );

            return;
        }


        alert(
            "✅ تم تعديل المحاضرة بنجاح"
        );


        await loadLectures();

    } catch (error) {

        console.error(
            "editLecture error:",
            error
        );

        alert(
            "حدث خطأ أثناء تعديل المحاضرة"
        );
    }
}


// =====================================
// حذف محاضرة
// =====================================

async function deleteLecture(id) {

    const confirmed =
        confirm(
            "هل أنت متأكد من حذف هذه المحاضرة؟"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/weekly-schedule/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (
            response.status === 401
        ) {

            logout();
            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "فشل حذف المحاضرة"
            );

            return;
        }


        alert(
            "✅ تم حذف المحاضرة"
        );


        await loadLectures();

    } catch (error) {

        console.error(
            "deleteLecture error:",
            error
        );

        alert(
            "حدث خطأ أثناء حذف المحاضرة"
        );
    }
}


// =====================================
// جعل الدوال متاحة للأزرار
// =====================================

window.editLecture =
    editLecture;

window.deleteLecture =
    deleteLecture;


// =====================================
// الأسبوع السابق
// =====================================

if (prevWeekBtn) {

    prevWeekBtn.addEventListener(
        "click",
        () => {

            currentWeekDate.setDate(
                currentWeekDate.getDate() - 7
            );

            renderSchedule();
        }
    );
}


// =====================================
// الأسبوع التالي
// =====================================

if (nextWeekBtn) {

    nextWeekBtn.addEventListener(
        "click",
        () => {

            currentWeekDate.setDate(
                currentWeekDate.getDate() + 7
            );

            renderSchedule();
        }
    );
}


// =====================================
// هذا الأسبوع
// =====================================

if (todayBtn) {

    todayBtn.addEventListener(
        "click",
        () => {

            currentWeekDate =
                new Date();

            renderSchedule();
        }
    );
}


// =====================================
// التشغيل عند فتح الصفحة
// =====================================

(async function init() {

    updateWeekDates();

    await loadSubjects();

    await loadLectures();

})();
