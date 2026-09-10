const db = require("./db");

async function checkUpcomingLectures() {
    try {
        const result = await db.query(`
            SELECT
                lectures.id AS lecture_id,
                lectures.title,
                lectures.lecture_date,
                lectures.start_time,
                enrollments.student_id
            FROM public.lectures
            JOIN public.enrollments
                ON lectures.subject_id = enrollments.subject_id
            WHERE enrollments.status = 'active'`
        );

        for (const lecture of result.rows) {

            const date = new Date(lecture.lecture_date);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            const time = String(lecture.start_time).split(".")[0];

            const lectureDateTime = new Date(
                year + "-" + month + "-" + day + "T" + time
            );

            if (isNaN(lectureDateTime.getTime())) {
                continue;
            }

            const now = new Date();

            const difference =
                (lectureDateTime - now) / (1000 * 60);

            console.log(
                "Lecture " +
                lecture.lecture_id +
                ": " +
                difference.toFixed(2) +
                " minutes remaining"
            );

            if (difference > 0 && difference <= 5) {

                const check = await db.query(
                    "SELECT id FROM public.notifications WHERE student_id = $1 AND lecture_id = $2",
                    [
                        lecture.student_id,
                        lecture.lecture_id
                    ]
                );

                if (check.rows.length === 0) {

                    await db.query(
                        "INSERT INTO public.notifications (student_id, lecture_id, message, notification_time, is_read) VALUES ($1, $2, $3, NOW(), false)",
                        [
                            lecture.student_id,
                            lecture.lecture_id,
                            "تذكير: عندك محاضرة بعد 5 دقائق"
                        ]
                    );

                    console.log(
                        "Notification created for student " +
                        lecture.student_id
                    );

                } else {

                    console.log(
                        "Notification already exists for student " +
                        lecture.student_id +
                        ", lecture " +
                        lecture.lecture_id
                    );
                }
            }
        }

    } catch (error) {
        console.error(
            "Notification scheduler error:",
            error
        );
    }
}

setInterval(checkUpcomingLectures, 60 * 1000);

checkUpcomingLectures();

console.log("Notification scheduler is running");