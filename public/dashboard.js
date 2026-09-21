const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
} else {

    // =========================
    // دالة الطلبات مع التوكن
    // =========================
    async function apiFetch(url, options = {}) {

        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ في الاتصال بالسيرفر");
        }

        return data;
    }


    // =========================
    // تحميل بيانات الطالب
    // =========================
    async function loadStudent() {

        try {

            const student = await apiFetch("/students/me");

            document.getElementById("studentName").textContent =
                student.name || "الطالب";


            // =========================
            // إظهار إدارة النظام للـAdmin فقط
            // =========================

            const adminSection =
                document.getElementById("adminSection");

            if (adminSection) {

                if (student.role === "admin") {

                    adminSection.style.display = "block";

                } else {

                    adminSection.style.display = "none";

                }
            }


            // تحديث البيانات المحلية
            localStorage.setItem(
                "student",
                JSON.stringify(student)
            );


        } catch (error) {

            console.error("Student error:", error);

            logout();

        }
    }


    // =========================
    // عدد المواد
    // =========================
    async function loadSubjectsCount() {

        try {

            const data = await apiFetch("/subjects");

            document.getElementById("subjectsCount").textContent =
                Array.isArray(data) ? data.length : 0;

        } catch (error) {

            console.error("Subjects count error:", error);

            document.getElementById("subjectsCount").textContent = "0";
        }
    }


    // =========================
    // عدد المحاضرات
    // =========================
    async function loadLecturesCount() {

        try {

            const data = await apiFetch("/lectures");

            document.getElementById("lecturesCount").textContent =
                Array.isArray(data) ? data.length : 0;

        } catch (error) {

            console.error("Lectures count error:", error);

            document.getElementById("lecturesCount").textContent = "0";
        }
    }


    // =========================
    // عدد الامتحانات
    // =========================
    async function loadExamsCount() {

        try {

            const data = await apiFetch("/exams");

            document.getElementById("examsCount").textContent =
                Array.isArray(data) ? data.length : 0;

        } catch (error) {

            console.error("Exams count error:", error);

            document.getElementById("examsCount").textContent = "0";
        }
    }


    // =========================
    // عدد الإشعارات غير المقروءة
    // =========================
    async function loadNotificationsCount() {

        try {

            const data =
                await apiFetch("/notifications/unread-count");

            document.getElementById("notificationsCount").textContent =
                data.count ?? 0;

        } catch (error) {

            console.error(
                "Notifications count error:",
                error
            );

            document.getElementById("notificationsCount").textContent =
                "0";
        }
    }


    // =========================
    // تنسيق التاريخ
    // =========================
    function formatDate(dateValue) {

        if (!dateValue) {
            return "غير محدد";
        }

        const date = new Date(dateValue);

        if (isNaN(date.getTime())) {
            return "غير محدد";
        }

        return date.toLocaleDateString("ar-LY", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }


    // =========================
    // تنسيق الوقت
    // =========================
    function formatTime(timeValue) {

        if (!timeValue) {
            return "غير محدد";
        }

        const match =
            String(timeValue).match(/^(\d{2}):(\d{2})/);

        if (match) {
            return `${match[1]}:${match[2]}`;
        }

        return timeValue;
    }


    // =========================
    // المحاضرة القادمة
    // =========================
    async function loadNextLecture() {

        const nextLecture =
            document.getElementById("nextLecture");

        try {

            const lecture =
                await apiFetch("/lectures/next");


            if (!lecture) {

                nextLecture.innerHTML =
                    "<p>مافيش محاضرات قادمة حاليًا.</p>";

                return;
            }


            const lectureDate =
                formatDate(lecture.lecture_date);


            const startTime =
                formatTime(lecture.start_time);


            const endTime =
                formatTime(lecture.end_time);


            const hall =
                lecture.hall ||
                lecture.room ||
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


    // =========================
    // تسجيل الخروج
    // =========================
    function logout() {

        localStorage.removeItem("token");
        localStorage.removeItem("student");

        window.location.href = "index.html";
    }


    // نجعل logout متاحًا لزر HTML
    window.logout = logout;


    // =========================
    // تشغيل الصفحة
    // =========================
    loadStudent();

    loadSubjectsCount();

    loadLecturesCount();

    loadExamsCount();

    loadNotificationsCount();

    loadNextLecture();

}
