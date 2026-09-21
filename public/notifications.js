const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

const notificationsList = document.getElementById("notificationsList");

async function loadNotifications() {
    try {
        const response = await fetch("/notifications", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ في تحميل الإشعارات");
        }

        if (!data || data.length === 0) {
            notificationsList.innerHTML = `
                <p style="text-align:center;">
                    مافيش إشعارات حاليًا 🔔
                </p>
            `;
            return;
        }

        notificationsList.innerHTML = "";

        data.forEach(notification => {
            const card = document.createElement("div");

            card.className = "dashboard-card";
            card.style.marginBottom = "15px";
            card.style.textAlign = "right";

            if (!notification.is_read) {
                card.style.borderRight = "4px solid #007bff";
            }

            card.innerHTML = `
                <h2>
                    ${notification.is_read ? "🔔" : "🔵"}
                    ${notification.title || "إشعار"}
                </h2>

                <p>
                    ${notification.message || ""}
                </p>

                ${
                    notification.lecture_title
                        ? `
                            <p>
                                📚 المحاضرة:
                                ${notification.lecture_title}
                            </p>
                        `
                        : ""
                }

                ${
                    notification.lecture_date
                        ? `
                            <p>
                                📅 التاريخ:
                                ${formatDate(notification.lecture_date)}
                            </p>
                        `
                        : ""
                }

                ${
                    notification.start_time
                        ? `
                            <p>
                                ⏰ الوقت:
                                ${formatTime(notification.start_time)}
                            </p>
                        `
                        : ""
                }

                <p style="font-size:13px; opacity:0.7;">
                    ${formatDateTime(notification.created_at)}
                </p>

                ${
                    !notification.is_read
                        ? `
                            <button
                                onclick="markAsRead(${notification.id})"
                                style="margin-top:10px;"
                            >
                                تعليم كمقروء
                            </button>
                        `
                        : ""
                }

                <button
                    onclick="deleteNotification(${notification.id})"
                    style="margin-top:10px;"
                >
                    حذف
                </button>
            `;

            notificationsList.appendChild(card);
        });

    } catch (error) {
        console.error("Notifications error:", error);

        notificationsList.innerHTML = `
            <p style="text-align:center;">
                ${error.message}
            </p>
        `;
    }
}


// =========================
// تعليم إشعار كمقروء
// =========================
async function markAsRead(id) {
    try {
        const response = await fetch(`/notifications/${id}/read`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ");
        }

        loadNotifications();

    } catch (error) {
        console.error("Mark notification as read error:", error);
        alert(error.message);
    }
}


// =========================
// تعليم كل الإشعارات كمقروءة
// =========================
async function markAllAsRead() {
    try {
        const response = await fetch("/notifications/read-all", {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ");
        }

        loadNotifications();

    } catch (error) {
        console.error("Mark all notifications error:", error);
        alert(error.message);
    }
}


// =========================
// حذف إشعار
// =========================
async function deleteNotification(id) {
    try {
        const response = await fetch(`/notifications/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "حدث خطأ");
        }

        loadNotifications();

    } catch (error) {
        console.error("Delete notification error:", error);
        alert(error.message);
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
        return dateValue;
    }

    return date.toLocaleDateString("ar-LY", {
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


// =========================
// تنسيق تاريخ ووقت الإشعار
// =========================
function formatDateTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("ar-LY", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}


// =========================
// الرجوع للوحة التحكم
// =========================
function goBack() {
    window.location.href = "dashboard.html";
}


// تشغيل تحميل الإشعارات
loadNotifications();
