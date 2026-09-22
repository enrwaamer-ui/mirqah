const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
} else {

    const subjectsList =
        document.getElementById("subjectsList");

    const addSubjectForm =
        document.getElementById("addSubjectForm");

    const subjectMessage =
        document.getElementById("subjectMessage");


    // ==========================================
    // تحميل المواد الخاصة بالطالب
    // ==========================================

    async function loadSubjects() {

        try {

            subjectsList.innerHTML =
                "<p>جاري تحميل المواد...</p>";

            const response = await fetch("/subjects", {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("student");
                    window.location.href = "index.html";
                    return;
                }

                throw new Error(
                    data.error || "حدث خطأ في تحميل المواد"
                );
            }


            // لا توجد مواد

            if (!data || data.length === 0) {

                subjectsList.innerHTML = `
                    <div class="dashboard-card"
                         style="text-align:center;">

                        <h3>
                            📚 مافيش مواد مضافة حاليًا
                        </h3>

                        <p>
                            استخدم نموذج إضافة مادة لإضافة أول مادة لك.
                        </p>

                    </div>
                `;

                return;
            }


            // عرض المواد

            subjectsList.innerHTML = "";


            data.forEach(subject => {

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
                        📚 ${escapeHtml(subject.name)}
                    </h2>

                    <p style="font-size:16px;">
                        🔢 كود المادة:
                        ${subject.code
                            ? escapeHtml(subject.code)
                            : "غير محدد"}
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
                            onclick="editSubject(
                                ${subject.id},
                                '${escapeJs(subject.name)}',
                                '${escapeJs(subject.code || "")}'
                            )"
                        >
                            ✏️ تعديل
                        </button>


                        <button
                            type="button"
                            onclick="deleteSubject(${subject.id})"
                        >
                            🗑️ حذف
                        </button>

                    </div>

                `;

                subjectsList.appendChild(card);

            });

        } catch (error) {

            console.error(
                "Subjects error:",
                error
            );

            subjectsList.innerHTML = `
                <p style="text-align:center;">
                    ${escapeHtml(error.message)}
                </p>
            `;
        }
    }


    // ==========================================
    // إضافة مادة
    // ==========================================

    if (addSubjectForm) {

        addSubjectForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const nameInput =
                    document.getElementById(
                        "subjectName"
                    );

                const codeInput =
                    document.getElementById(
                        "subjectCode"
                    );


                const name =
                    nameInput.value.trim();

                const code =
                    codeInput.value.trim();


                if (!name) {

                    subjectMessage.textContent =
                        "اكتبي اسم المادة.";

                    return;
                }


                subjectMessage.textContent =
                    "جاري إضافة المادة...";


                try {

                    const response =
                        await fetch("/subjects", {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: JSON.stringify({
                                name,
                                code
                            })
                        });


                    const data =
                        await response.json();


                    if (!response.ok) {

                        if (response.status === 401) {

                            localStorage.removeItem(
                                "token"
                            );

                            localStorage.removeItem(
                                "student"
                            );

                            window.location.href =
                                "index.html";

                            return;
                        }

                        throw new Error(
                            data.error ||
                            "فشل إضافة المادة"
                        );
                    }


                    subjectMessage.textContent =
                        "✅ تمت إضافة المادة بنجاح";


                    // تفريغ النموذج

                    nameInput.value = "";
                    codeInput.value = "";


                    // تحديث القائمة

                    await loadSubjects();


                } catch (error) {

                    console.error(
                        "Add subject error:",
                        error
                    );

                    subjectMessage.textContent =
                        error.message;
                }

            }
        );
    }


    // ==========================================
    // تعديل مادة
    // ==========================================

    window.editSubject =
        async function (
            subjectId,
            currentName,
            currentCode
        ) {

            const newName =
                prompt(
                    "اكتب اسم المادة الجديد:",
                    currentName
                );


            if (newName === null) {
                return;
            }


            const cleanName =
                newName.trim();


            if (!cleanName) {

                alert(
                    "اسم المادة لا يمكن أن يكون فارغًا."
                );

                return;
            }


            const newCode =
                prompt(
                    "اكتب كود المادة الجديد (اختياري):",
                    currentCode
                );


            if (newCode === null) {
                return;
            }


            try {

                const response =
                    await fetch(
                        `/subjects/${subjectId}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`
                            },

                            body: JSON.stringify({
                                name: cleanName,
                                code: newCode.trim()
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    if (response.status === 401) {

                        localStorage.removeItem(
                            "token"
                        );

                        localStorage.removeItem(
                            "student"
                        );

                        window.location.href =
                            "index.html";

                        return;
                    }

                    throw new Error(
                        data.error ||
                        "فشل تعديل المادة"
                    );
                }


                alert(
                    "✅ تم تعديل المادة بنجاح"
                );


                await loadSubjects();


            } catch (error) {

                console.error(
                    "Edit subject error:",
                    error
                );

                alert(error.message);
            }

        };


    // ==========================================
    // حذف مادة
    // ==========================================

    window.deleteSubject =
        async function (subjectId) {

            const confirmed =
                confirm(
                    "هل أنت متأكد من حذف هذه المادة من موادك؟"
                );


            if (!confirmed) {
                return;
            }


            try {

                const response =
                    await fetch(
                        `/subjects/${subjectId}`,
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

                    if (response.status === 401) {

                        localStorage.removeItem(
                            "token"
                        );

                        localStorage.removeItem(
                            "student"
                        );

                        window.location.href =
                            "index.html";

                        return;
                    }

                    throw new Error(
                        data.error ||
                        "فشل حذف المادة"
                    );
                }


                alert(
                    "✅ تم حذف المادة من موادك"
                );


                await loadSubjects();


            } catch (error) {

                console.error(
                    "Delete subject error:",
                    error
                );

                alert(error.message);
            }

        };


    // ==========================================
    // حماية النصوص المعروضة
    // ==========================================

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function escapeJs(value) {

        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\r?\n/g, " ");
    }


    // ==========================================
    // رجوع للرئيسية
    // ==========================================

    window.goBack = function () {

        window.location.href =
            "dashboard.html";
    };


    // ==========================================
    // تشغيل الصفحة
    // ==========================================

    loadSubjects();
}
