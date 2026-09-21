const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
} else {

    const subjectsList =
        document.getElementById("subjectsList");

    fetch("/subjects", {
        method: "GET",

        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
        .then(async response => {

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "حدث خطأ في تحميل المواد"
                );
            }

            return data;
        })
        .then(data => {

            if (data.length === 0) {
                subjectsList.innerHTML =
                    "<p>مافيش مواد مسجّل فيها حاليًا.</p>";

                return;
            }

            subjectsList.innerHTML = "";

            data.forEach(subject => {

                const card =
                    document.createElement("div");

                card.className = "dashboard-card";

                card.style.marginBottom = "15px";
                card.style.textAlign = "right";

                card.innerHTML = `
                    <h2>
                        📚 ${subject.name}
                    </h2>

                    <p style="font-size: 16px;">
                        🔢 كود المادة:
                        ${subject.code || "غير محدد"}
                    </p>
                `;

                subjectsList.appendChild(card);
            });

        })
        .catch(error => {

            console.error("Subjects error:", error);

            subjectsList.innerHTML =
                `<p>${error.message}</p>`;

        });
}

function goBack() {
    window.location.href = "dashboard.html";
}
