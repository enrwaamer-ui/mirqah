const studentData =
    localStorage.getItem("student");


if (!studentData) {

    window.location.href = "index.html";

} else {

    const student =
        JSON.parse(studentData);


    document.getElementById("profileName").textContent =
        student.name || "";


    document.getElementById("profileEmail").textContent =
        student.email || "";


    document.getElementById("profileMajor").textContent =
        student.major || "";


    document.getElementById("profileUniversity").textContent =
        student.university || "";


    document.getElementById("profileYear").textContent =
        student.academic_year || "";


    document.getElementById("profileSeat").textContent =
        student.seat_number || "";

}