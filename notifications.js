const notificationsList =
    document.getElementById("notificationsList");


fetch("/notifications")

    .then(response => response.json())

    .then(notifications => {

        notificationsList.innerHTML = "";


        if (notifications.length === 0) {

            notificationsList.innerHTML =
                "<p>مافيش إشعارات حالياً.</p>";

            return;
        }


        notifications.forEach(notification => {

            const card =
                document.createElement("div");


            card.className = "dashboard-card";

            card.style.marginBottom = "20px";


            card.innerHTML = `

                <h3>
                    🔔 إشعار
                </h3>

                <p>
                    ${notification.message}
                </p>

                <p>
                    🕐
                    ${notification.notification_time}
                </p>

            ;`


            notificationsList.appendChild(card);

        });

    })


    .catch(error => {

        console.error(error);

        notificationsList.innerHTML =
            "<p>حدث خطأ في تحميل الإشعارات.</p>";

    });