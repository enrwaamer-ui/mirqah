
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

const lecturesList = document.getElementById("lecturesList");
const addLectureForm = document.getElementById("addLectureForm");
const subjectSelect = document.getElementById("subjectId");
const lectureMessage = document.getElementById("lectureMessage");


/* =========================
   تسجيل الخروج
========================= */

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("student");

    window.location.href = "index.html";
}


/* =========================
   تحميل المواد
========================= */

async function loadSubjects() {

    try {

        const response = await fetch("/subjects", {
            method: "GET",

            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {

            if (response.status === 401) {
                logout();
                return;
            }

            throw new Error(
                data.error ||
                "حدث خطأ في تحميل المواد"
            );
        }


        subjectSelect.innerHTML = `
            <option value="">
                اختر المادة
            </option>
        `;


        if (!data || data.length === 0) {

            subjectSelect.innerHTML = `
                <option value="">
                    مافيش مواد عندك
                </option>
            `;

            return;
        }


        data.forEach(subject => {

            const option =
                document.createElement("option");

            option.value = subject.id;

            option.textContent =
                `${subject.name}${
                    subject.code
                        ? ` - ${subject.code}`
                        : ""
                }`;

            subjectSelect.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Subjects error:",
            error
        );

        subjectSelect.innerHTML = `
            <option value="">
                فشل تحميل المواد
            </option>
        `;
    }
}


/* =========================
   تحميل المحاضرات
========================= */

async function loadLectures() {

    try {

        lecturesList.innerHTML = `
            <p style="text-align:center;">
                جاري تحميل المحاضرات...
            </p>
        `;


        const response =
            await fetch("/lectures", {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            });


        const data =
            await response.json();


        if (!response.ok) {

            if (response.status === 401) {
                logout();
                return;
            }

            throw new Error(
                data.error ||
                "حدث خطأ في تحميل المحاضرات"
            );
        }


        if (!data || data.length === 0) {

            lecturesList.innerHTML = `
                <div
                    class="dashboard-card"
                    style="text-align:center;"
                >

                    <h3>
                        🎓 مافيش محاضرات مضافة حاليًا
                    </h3>

                    <p>
                        أضف أول محاضرة من النموذج الموجود فوق.
                    </p>

                </div>
            `;

            return;
        }


        lecturesList.innerHTML = "";


        data.forEach(lecture => {

            const card =
                document.createElement("div");

            card.className =
                "dashboard-card";

            card.style.marginBottom =
                "15px";

            card.style.textAlign =
                "right";


            card.innerHTML = `

                <h2>
                    📚 ${
                        escapeHtml(
                            lecture.subject_name ||
                            "بدون مادة"
                        )
                    }
                </h2>

                <p>
                    📝 المحاضرة:
                    ${
                        escapeHtml(
                            lecture.title ||
                            "غير محدد"
                        )
                    }
                </p>

                <p>
                    📅 التاريخ:
                    ${
                        formatDate(
                            lecture.lecture_date
                        )
                    }
                </p>

                <p>
                    ⏰ الوقت:
                    ${
                        formatTime(
                            lecture.start_time
                        )
                    }

                    -

                    ${
                        formatTime(
                            lecture.end_time
                        )
                    }
                </p>

                <p>
                    🏫 القاعة:
                    ${
                        escapeHtml(
                            lecture.hall ||
                            "غير محددة"
                        )
                    }
                </p>

                <p>
                    👨‍🏫 المدرس:
                    ${
                        escapeHtml(
                            lecture.instructor ||
                            "غير محدد"
                        )
                    }
                </p>

                <p>
                    🔢 كود المادة:
                    ${
                        escapeHtml(
                            lecture.subject_code ||
                            "غير محدد"
                        )
                    }
                </p>

                <div
                    style="
                        display:flex;
                        gap:10px;
                        flex-wrap:wrap;
                        margin-top:15px;
                    "
                >

                    <button
                        type="button"
                        onclick="editLecture(${lecture.id})"
                    >
                        ✏️ تعديل
                    </button>

                    <button
                        type="button"
                        onclick="deleteLecture(${lecture.id})"
                    >
                        🗑️ حذف
                    </button>

                </div>

            `;

            lecturesList.appendChild(card);

        });

    } catch (error) {

        console.error(
            "Lectures error:",
            error
        );

        lecturesList.innerHTML = `
            <p
                style="
                    text-align:center;
                    color:red;
                "
            >
                ${
                    escapeHtml(
                        error.message
                    )
                }
            </p>
        `;
    }
}


/* =========================
   إضافة محاضرة
========================= */

if (addLectureForm) {

    addLectureForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* المادة */

            const subjectId =
                subjectSelect.value;


            /* اسم المحاضرة */

            const title =
                document.getElementById(
                    "lectureTitle"
                ).value.trim();


            /* التاريخ */

            const lectureDate =
                document.getElementById(
                    "lectureDate"
                ).value;


            /* وقت البداية */

            const startTime =
                document.getElementById(
                    "startTime"
                ).value;


            /* وقت النهاية */

            const endTime =
                document.getElementById(
                    "endTime"
                ).value;


            /* القاعة */

            const hall =
                document.getElementById(
                    "hall"
                ).value.trim();


            /* التحقق */

            if (
                !subjectId ||
                !title ||
                !lectureDate ||
                !startTime ||
                !endTime
            ) {

                lectureMessage.textContent =
                    "⚠️ لازم تعبي المادة واسم المحاضرة والتاريخ والأوقات.";

                return;
            }


            if (startTime >= endTime) {

                lectureMessage.textContent =
                    "⚠️ وقت النهاية لازم يكون بعد وقت البداية.";

                return;
            }


            lectureMessage.textContent =
                "جاري إضافة المحاضرة...";


            try {

                const response =
                    await fetch(
                        "/lectures",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body:
                                JSON.stringify({

                                    subject_id:
                                        Number(
                                            subjectId
                                        ),

                                    title:
                                        title,

                                    lecture_date:
                                        lectureDate,

                                    start_time:
                                        startTime,

                                    end_time:
                                        endTime,

                                    hall:
                                        hall
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    if (
                        response.status === 401
                    ) {
                        logout();
                        return;
                    }

                    throw new Error(
                        data.error ||
                        "فشل إضافة المحاضرة"
                    );
                }


                lectureMessage.textContent =
                    "✅ تمت إضافة المحاضرة بنجاح";


                addLectureForm.reset();


                await loadSubjects();

                await loadLectures();


            } catch (error) {

                console.error(
                    "Add lecture error:",
                    error
                );

                lectureMessage.textContent =
                    error.message;
            }

        }
    );
}


/* =========================
   تعديل المحاضرة
========================= */

window.editLecture =
    async function (lectureId) {

        try {

            const response =
                await fetch(
                    `/lectures/${lectureId}`,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );


            const lecture =
                await response.json();


            if (!response.ok) {

                if (
                    response.status === 401
                ) {
                    logout();
                    return;
                }

                throw new Error(
                    lecture.error ||
                    "فشل تحميل بيانات المحاضرة"
                );
            }


            /* اسم المحاضرة */

            const newTitle =
                prompt(
                    "اسم المحاضرة:",
                    lecture.title || ""
                );


            if (newTitle === null) {
                return;
            }


            /* التاريخ */

            const newDate =
                prompt(
                    "التاريخ بصيغة YYYY-MM-DD:",
                    formatInputDate(
                        lecture.lecture_date
                    )
                );


            if (newDate === null) {
                return;
            }


            /* وقت البداية */

            const newStart =
                prompt(
                    "وقت البداية بصيغة HH:MM:",
                    formatInputTime(
                        lecture.start_time
                    )
                );


            if (newStart === null) {
                return;
            }


            /* وقت النهاية */

            const newEnd =
                prompt(
                    "وقت النهاية بصيغة HH:MM:",
                    formatInputTime(
                        lecture.end_time
                    )
                );


            if (newEnd === null) {
                return;
            }


            /* القاعة */

            const newHall =
                prompt(
                    "القاعة:",
                    lecture.hall || ""
                );


            if (newHall === null) {
                return;
            }


            if (
                newStart.trim() >=
                newEnd.trim()
            ) {

                alert(
                    "وقت النهاية لازم يكون بعد وقت البداية."
                );

                return;
            }


            const responseUpdate =
                await fetch(
                    `/lectures/${lectureId}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({

                                subject_id:
                                    lecture.subject_id,

                                title:
                                    newTitle.trim(),

                                lecture_date:
                                    newDate.trim(),

                                start_time:
                                    newStart.trim(),

                                end_time:
                                    newEnd.trim(),

                                hall:
                                    newHall.trim(),

                                instructor:
                                    lecture.instructor ||
                                    ""
                            })
                    }
                );


            const data =
                await responseUpdate.json();


            if (!responseUpdate.ok) {

                if (
                    responseUpdate.status === 401
                ) {
                    logout();
                    return;
                }

                throw new Error(
                    data.error ||
                    "فشل تعديل المحاضرة"
                );
            }


            alert(
                "✅ تم تعديل المحاضرة بنجاح"
            );


            await loadLectures();


        } catch (error) {

            console.error(
                "Edit lecture error:",
                error
            );

            alert(
                error.message
            );
        }
    };


/* =========================
   حذف المحاضرة
========================= */

window.deleteLecture =
    async function (lectureId) {

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
                    `/lectures/${lectureId}`,
                    {
                        method: "DELETE",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                if (
                    response.status === 401
                ) {
                    logout();
                    return;
                }

                throw new Error(
                    data.error ||
                    "فشل حذف المحاضرة"
                );
            }


            alert(
                "✅ تم حذف المحاضرة بنجاح"
            );


            await loadLectures();


        } catch (error) {

            console.error(
                "Delete lecture error:",
                error
            );

            alert(
                error.message
            );
        }
    };


/* =========================
   تنسيق التاريخ
========================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "غير محدد";
    }


    const date =
        new Date(dateValue);


    if (isNaN(date.getTime())) {
        return String(dateValue);
    }


    return date.toLocaleDateString(
        "ar-LY",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );
}


/* =========================
   تجهيز التاريخ للتعديل
========================= */

function formatInputDate(dateValue) {

    if (!dateValue) {
        return "";
    }


    const value =
        String(dateValue);


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return value;
    }


    const date =
        new Date(value);


    if (isNaN(date.getTime())) {

        return value
            .split("T")[0];
    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


/* =========================
   تنسيق الوقت للعرض
========================= */

function formatTime(timeValue) {

    if (!timeValue) {
        return "غير محدد";
    }


    const parts =
        String(timeValue).split(":");


    if (parts.length < 2) {
        return String(timeValue);
    }


    const hour =
        Number(parts[0]);


    const minute =
        parts[1];


    if (isNaN(hour)) {
        return String(timeValue);
    }


    const period =
        hour >= 12 ? "م" : "ص";


    const displayHour =
        hour % 12 || 12;


    return `${displayHour}:${minute} ${period}`;
}


/* =========================
   تجهيز الوقت للتعديل
========================= */

function formatInputTime(timeValue) {

    if (!timeValue) {
        return "";
    }


    return String(timeValue)
        .substring(0, 5);
}


/* =========================
   حماية النصوص
========================= */

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================
   العودة للرئيسية
========================= */

function goBack() {

    window.location.href =
        "dashboard.html";
}


/* =========================
   تشغيل الصفحة
========================= */

loadSubjects();
loadLectures();
