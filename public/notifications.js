const notificationsList = document.getElementById("notificationsList");

const studentData = localStorage.getItem("student");

if (!studentData) {
    window.location.href = "index.html";
} else {

    const student = JSON.parse(studentData);

    fetch("/notifications?student_id=" + student.id)
        .then(function(response) {
            return response.json();
        })
        .then(function(notifications) {

            notificationsList.innerHTML = "";

            if (notifications.length === 0) {
                notificationsList.innerHTML =
                    "<p>مافيش إشعارات حالياً 🔔</p>";
                return;
            }

            notifications.forEach(function(notification) {

                const card = document.createElement("div");

                card.className = "dashboard-card";
                card.style.marginBottom = "20px";

                const title = document.createElement("h3");
                title.textContent = "🔔 إشعار";

                const message = document.createElement("p");
                message.textContent = notification.message;

                const time = document.createElement("p");
                time.textContent =
                    "🕐 وقت الإشعار: " +
                    notification.notification_time;

                const status = document.createElement("p");

                if (notification.is_read) {
                    status.textContent = "تمت القراءة ✅";
                } else {
                    status.textContent = "غير مقروء 🔵";
                }

                card.appendChild(title);
                card.appendChild(message);
                card.appendChild(time);
                card.appendChild(status);

                if (!notification.is_read) {

                    const button = document.createElement("button");

                    button.textContent = "تحديد كمقروء";

                    button.onclick = function() {
                        markAsRead(notification.id);
                    };

                    card.appendChild(button);
                }

                notificationsList.appendChild(card);
            });
        })
        .catch(function(error) {

            console.error(error);

            notificationsList.innerHTML =
                "<p>حدث خطأ في تحميل الإشعارات.</p>";
        });
}


function markAsRead(notificationId) {

    fetch("/notifications/" + notificationId + "/read", {
        method: "PUT"
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {

        console.log("Notification marked as read:", data);

        location.reload();
    })
    .catch(function(error) {

        console.error(error);
    });
}