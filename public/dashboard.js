const token = localStorage.getItem("token");


// ==========================================
// التحقق من وجود التوكن
// ==========================================

if (!token) {

    window.location.href = "index.html";

} else {


    // ==========================================
    // دالة تسجيل الخروج
    // ==========================================

    function logout() {

        localStorage.removeItem("token");
        localStorage.removeItem("student");

        window.location.href = "index.html";
    }


    // جعل logout متاحًا لزر HTML
    window.logout = logout;


    // ==========================================
    // دالة الطلبات مع التوكن
    // ==========================================

    async function apiFetch(url, options = {}) {

        const response = await fetch(url, {
            ...options,

            headers: {
                ...(options.headers || {}),
                "Authorization": `Bearer ${token}`
            }
        });


        let data;

        try {

            data = await response.json();

        } catch (error) {

            data = null;

        }


        // إذا انتهت الجلسة
        if (response.status === 401) {

            logout();

            throw new Error(
                "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى"
            );
        }


        if (!response.ok) {

            throw new Error(
                data?.error ||
                "حدث خطأ في الاتصال بالسيرفر"
            );
        }


        return data;
    }


    // ==========================================
    // تحميل بيانات الطالب الحالي
    // ==========================================

    async function loadStudent() {

        try {

            const student =
                await apiFetch("/students/me");


            // اسم الطالب
            const studentName =
                document.getElementById("studentName");


            if (studentName) {

                studentName.textContent =
                    student.name || "الطالب";
            }


            // ==========================================
            // إظهار قسم الإدارة للأدمن فقط
            // ==========================================

            const adminSection =
                document.getElementById("adminSection");


            if (adminSection) {

                if (student.role === "admin") {

                    adminSection.style.display =
                        "block";

                } else {

                    adminSection.style.display =
                        "none";
                }
            }


            // ==========================================
            // تحديث بيانات الطالب المحلية
            // ==========================================

            localStorage.setItem(
                "student",
                JSON.stringify(student)
            );


        } catch (error) {

            console.error(
                "Student error:",
                error
            );

            logout();
        }
    }


    // ==========================================
    // عدد المواد
    // ==========================================

    async function loadSubjectsCount() {

        const element =
            document.getElementById("subjectsCount");


        if (!element) {
            return;
        }


        try {

            const data =
                await apiFetch("/subjects");


            element.textContent =
                Array.isArray(data)
                    ? data.length
                    : 0;


        } catch (error) {

            console.error(
                "Subjects count error:",
                error
            );

            element.textContent = "0";
        }
    }


    // ==========================================
    // عدد المحاضرات
    // ==========================================

    async function loadLecturesCount() {

        const element =
            document.getElementById("lecturesCount");


        if (!element) {
            return;
        }


        try {

            const data =
                await apiFetch("/lectures");


            element.textContent =
                Array.isArray(data)
                    ? data.length
                    : 0;


        } catch (error) {

            console.error(
                "Lectures count error:",
                error
            );

            element.textContent = "0";
        }
    }


    // ==========================================
    // عدد الامتحانات
    // ==========================================

    async function loadExamsCount() {

        const element =
            document.getElementById("examsCount");


        if (!element) {
            return;
        }


        try {

            const data =
                await apiFetch("/exams");


            element.textContent =
                Array.isArray(data)
                    ? data.length
                    : 0;


        } catch (error) {

            console.error(
                "Exams count error:",
                error
            );

            element.textContent = "0";
        }
    }


    // ==========================================
    // عدد الإشعارات غير المقروءة
    // ==========================================

    async function loadNotificationsCount() {

        const element =
            document.getElementById(
                "notificationsCount"
            );


        if (!element) {
            return;
        }


        try {

            const data =
                await apiFetch(
                    "/notifications/unread-count"
                );


            element.textContent =
                data?.count ?? 0;


        } catch (error) {

            console.error(
                "Notifications count error:",
                error
            );

            element.textContent = "0";
        }
    }


    // ==========================================
    // تنسيق التاريخ
    // ==========================================

    function formatDate(dateValue) {

        if (!dateValue) {

            return "غير محدد";
        }


        const date =
            new Date(dateValue);


        if (isNaN(date.getTime())) {

            return "غير محدد";
        }


        return date.toLocaleDateString(
            "ar-LY",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
    }


    // ==========================================
    // تنسيق الوقت
    // ==========================================

    function formatTime(timeValue) {

        if (!timeValue) {

            return "غير محدد";
        }


        const match =
            String(timeValue).match(
                /^(\d{2}):(\d{2})/
            );


        if (match) {

            return `${match[1]}:${match[2]}`;
        }


        return String(timeValue);
    }


    // ==========================================
    // المحاضرة القادمة
    // ==========================================

    async function loadNextLecture() {

        const nextLecture =
            document.getElementById(
                "nextLecture"
            );


        if (!nextLecture) {
            return;
        }


        try {

            const lecture =
                await apiFetch(
                    "/lectures/next"
                );


            if (!lecture) {

                nextLecture.innerHTML =
                    "<p>مافيش محاضرات قادمة حاليًا.</p>";

                return;
            }


            const lectureDate =
                formatDate(
                    lecture.lecture_date
                );


            const startTime =
                formatTime(
                    lecture.start_time
                );


            const endTime =
                formatTime(
                    lecture.end_time
                );


            const hall =
                lecture.hall ||
                "غير محددة";


            nextLecture.innerHTML = `

                <h3>
                    ${lecture.title || "محاضرة"}
                </h3>

                <p>
                    📚 المادة:
                    ${lecture.subject_name || "غير محددة"}
                </p>

                <p>
                    📅 التاريخ:
                    ${lectureDate}
                </p>

                <p>
                    🕐 الوقت:
                    ${startTime} - ${endTime}
                </p>

                <p>
                    📍 القاعة:
                    ${hall}
                </p>

            `;


        } catch (error) {

            console.error(
                "Next lecture error:",
                error
            );


            nextLecture.innerHTML =
                "<p>حدث خطأ في تحميل المحاضرة القادمة.</p>";
        }
    }


    // ==========================================
    // تشغيل لوحة التحكم
    // ==========================================

    async function initDashboard() {

        // أولاً نتأكد من المستخدم والجلسة
        await loadStudent();


        // بعدها نحمل البيانات الخاصة بحسابه
        await Promise.all([
            loadSubjectsCount(),
            loadLecturesCount(),
            loadExamsCount(),
            loadNotificationsCount(),
            loadNextLecture()
        ]);
    }


    // ==========================================
    // تشغيل الصفحة
    // ==========================================

    initDashboard();

}
