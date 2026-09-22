const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

const examsList = document.getElementById("examsList");
const addExamForm = document.getElementById("addExamForm");
const subjectSelect = document.getElementById("subjectId");
const examMessage = document.getElementById("examMessage");


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

        subjectSelect.innerHTML = `
            <option value="">
                جاري تحميل المواد...
            </option>
        `;


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
   تحميل الامتحانات
========================= */

async function loadExams() {

    try {

        examsList.innerHTML = `
            <p style="text-align:center;">
                جاري تحميل الامتحانات...
            </p>
        `;


        const response =
            await fetch("/exams", {
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
                "حدث خطأ في تحميل الامتحانات"
            );
        }


        if (!data || data.length === 0) {

            examsList.innerHTML = `
                <div
                    class="dashboard-card"
                    style="text-align:center;"
                >

                    <h3>
                        📝 مافيش امتحانات مضافة حاليًا
                    </h3>

                    <p>
                        أضف أول امتحان من النموذج الموجود فوق.
                    </p>

                </div>
            `;

            return;
        }


        examsList.innerHTML = "";


        data.forEach(exam => {

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
                    📝 ${
                        escapeHtml(
                            exam.subject_display_name ||
                            exam.subject_name ||
                            "بدون مادة"
                        )
                    }
                </h2>


                <p>
                    📅 التاريخ:
                    ${
                        formatDate(
                            exam.exam_date
                        )
                    }
                </p>


                <p>
                    ⏰ الوقت:
                    ${
                        formatTime(
                            exam.start_time
                        )
                    }
                </p>


                <p>
                    🏫 القاعة:
                    ${
                        escapeHtml(
                            exam.hall ||
                            "غير محددة"
                        )
                    }
                </p>


                <p>
                    🔢 كود المادة:
                    ${
                        escapeHtml(
                            exam.subject_code ||
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
                        onclick="editExam(${exam.id})"
                    >
                        ✏️ تعديل
                    </button>


                    <button
                        type="button"
                        onclick="deleteExam(${exam.id})"
                    >
                        🗑️ حذف
                    </button>

                </div>

            `;


            examsList.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Exams error:",
            error
        );


        examsList.innerHTML = `
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
   إضافة امتحان
========================= */

if (addExamForm) {

    addExamForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const subjectId =
                subjectSelect.value;


            const examDate =
                document.getElementById(
                    "examDate"
                ).value;


            const startTime =
                document.getElementById(
                    "startTime"
                ).value;


            const hall =
                document.getElementById(
                    "hall"
                ).value.trim();


            if (
                !subjectId ||
                !examDate ||
                !startTime
            ) {

                examMessage.textContent =
                    "⚠️ لازم تختار المادة وتدخل التاريخ ووقت الامتحان.";

                return;
            }


            examMessage.textContent =
                "جاري إضافة الامتحان...";


            try {

                const response =
                    await fetch(
                        "/exams",
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

                                    exam_date:
                                        examDate,

                                    start_time:
                                        startTime,

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
                        "فشل إضافة الامتحان"
                    );
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
                    error.message;
            }

        }
    );
}


/* =========================
   تعديل الامتحان
========================= */

window.editExam =
    async function (examId) {

        try {

            const response =
                await fetch(
                    `/exams/${examId}`,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );


            const exam =
                await response.json();


            if (!response.ok) {

                if (
                    response.status === 401
                ) {
                    logout();
                    return;
                }


                throw new Error(
                    exam.error ||
                    "فشل تحميل بيانات الامتحان"
                );
            }


            const newDate =
                prompt(
                    "تاريخ الامتحان بصيغة YYYY-MM-DD:",
                    formatInputDate(
                        exam.exam_date
                    )
                );


            if (newDate === null) {
                return;
            }


            const newStart =
                prompt(
                    "وقت الامتحان بصيغة HH:MM:",
                    formatInputTime(
                        exam.start_time
                    )
                );


            if (newStart === null) {
                return;
            }


            const newHall =
                prompt(
                    "القاعة:",
                    exam.hall || ""
                );


            if (newHall === null) {
                return;
            }


            const responseUpdate =
                await fetch(
                    `/exams/${examId}`,
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
                                    exam.subject_id,

                                exam_date:
                                    newDate.trim(),

                                start_time:
                                    newStart.trim(),

                                hall:
                                    newHall.trim()
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
                    "فشل تعديل الامتحان"
                );
            }


            alert(
                "✅ تم تعديل الامتحان بنجاح"
            );


            await loadExams();


        } catch (error) {

            console.error(
                "Edit exam error:",
                error
            );


            alert(
                error.message
            );
        }
    };


/* =========================
   حذف الامتحان
========================= */

window.deleteExam =
    async function (examId) {

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
                    `/exams/${examId}`,
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
                    "فشل حذف الامتحان"
                );
            }


            alert(
                "✅ تم حذف الامتحان بنجاح"
            );


            await loadExams();


        } catch (error) {

            console.error(
                "Delete exam error:",
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


    const value =
        String(dateValue);


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const parts =
            value.split("-");


        const date =
            new Date(
                Number(parts[0]),
                Number(parts[1]) - 1,
                Number(parts[2])
            );


        return date.toLocaleDateString(
            "ar-LY",
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
    }


    const date =
        new Date(value);


    if (isNaN(date.getTime())) {
        return value;
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
   تنسيق الوقت
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

loadExams();
