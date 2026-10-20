CREATE DATABASE CollegeEventManagement;

USE CollegeEventManagement;

CREATE TABLE Students (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    student_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15)
);

CREATE TABLE Venues (
    venue_id INT PRIMARY KEY AUTO_INCREMENT,
    venue_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    capacity INT NOT NULL
);

CREATE TABLE Categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Organizers (
    organizer_id INT PRIMARY KEY AUTO_INCREMENT,
    organizer_name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    email VARCHAR(100) UNIQUE
);

CREATE TABLE Events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(100) NOT NULL,
    category_id INT,
    venue_id INT,
    organizer_id INT,
    event_date DATE NOT NULL,
    event_time TIME,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id),
    FOREIGN KEY (venue_id) REFERENCES Venues(venue_id),
    FOREIGN KEY (organizer_id) REFERENCES Organizers(organizer_id)
);

CREATE TABLE Registrations (
    registration_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    registration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Registered',
    UNIQUE (student_id, event_id),
    FOREIGN KEY (student_id) REFERENCES Students(student_id),
    FOREIGN KEY (event_id) REFERENCES Events(event_id)
);

CREATE TABLE Attendance (
    attendance_id INT PRIMARY KEY AUTO_INCREMENT,
    registration_id INT NOT NULL UNIQUE,
    attendance_status VARCHAR(20) NOT NULL,
    FOREIGN KEY (registration_id) REFERENCES Registrations(registration_id)
);

CREATE TABLE Feedback (
    feedback_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    rating INT NOT NULL,
    comments VARCHAR(500),
    FOREIGN KEY (student_id) REFERENCES Students(student_id),
    FOREIGN KEY (event_id) REFERENCES Events(event_id),
    CHECK (rating BETWEEN 1 AND 5),
    UNIQUE (student_id, event_id)
);

INSERT INTO Students (student_name, department, email, phone)
VALUES
('Aarav Sharma', 'Computer Science', 'aarav@example.com', '9876543210'),
('Priya Verma', 'Information Technology', 'priya@example.com', '9876543211'),
('Rahul Singh', 'Electronics', 'rahul@example.com', '9876543212'),
('Neha Gupta', 'Computer Science', 'neha@example.com', '9876543213'),
('Karan Patel', 'Mechanical', 'karan@example.com', '9876543214'),
('Sneha Kapoor', 'Information Technology', 'sneha@example.com', '9876543215');

INSERT INTO Venues (venue_name, location, capacity)
VALUES
('Main Auditorium', 'Block A', 500),
('Seminar Hall', 'Block B', 150),
('Sports Ground', 'Campus Ground', 1000),
('Computer Lab', 'Block C', 60);

INSERT INTO Categories (category_name)
VALUES
('Technical'),
('Cultural'),
('Sports'),
('Academic');

INSERT INTO Organizers (organizer_name, role, email)
VALUES
('Dr. Mehta', 'Faculty Coordinator', 'mehta@example.com'),
('Ananya Roy', 'Student Coordinator', 'ananya@example.com'),
('Rohit Malhotra', 'Sports Coordinator', 'rohit@example.com');

INSERT INTO Events
(event_name, category_id, venue_id, organizer_id, event_date, event_time)
VALUES
('Tech Fest', 1, 1, 1, '2026-11-15', '10:00:00'),
('Dance Competition', 2, 2, 2, '2026-11-20', '14:00:00'),
('Cricket Tournament', 3, 3, 3, '2026-11-25', '09:00:00'),
('Coding Competition', 1, 4, 1, '2026-12-05', '11:00:00'),
('Science Exhibition', 4, 1, 2, '2026-12-10', '10:30:00');

INSERT INTO Registrations
(student_id, event_id, registration_date, status)
VALUES
(1, 1, '2026-10-20', 'Registered'),
(2, 1, '2026-10-20', 'Registered'),
(3, 3, '2026-10-20', 'Registered'),
(4, 2, '2026-10-20', 'Registered'),
(1, 2, '2026-10-20', 'Registered'),
(5, 4, '2026-10-20', 'Registered'),
(6, 5, '2026-10-20', 'Registered'),
(2, 4, '2026-10-20', 'Registered'),
(3, 1, '2026-10-20', 'Registered');

INSERT INTO Attendance (registration_id, attendance_status)
VALUES
(1, 'Present'),
(2, 'Present'),
(3, 'Absent'),
(4, 'Present'),
(5, 'Absent'),
(6, 'Present');

INSERT INTO Feedback (student_id, event_id, rating, comments)
VALUES
(1, 1, 5, 'Excellent event'),
(2, 1, 4, 'Very informative'),
(4, 2, 5, 'Amazing performance'),
(5, 4, 4, 'Enjoyed the competition');

SELECT * FROM Students;
SELECT * FROM Venues;
SELECT * FROM Categories;
SELECT * FROM Organizers;
SELECT * FROM Events;
SELECT * FROM Registrations;
SELECT * FROM Attendance;
SELECT * FROM Feedback;

SELECT
    e.event_name,
    c.category_name,
    v.venue_name,
    v.location,
    o.organizer_name,
    e.event_date,
    e.event_time
FROM Events e
JOIN Categories c ON e.category_id = c.category_id
JOIN Venues v ON e.venue_id = v.venue_id
JOIN Organizers o ON e.organizer_id = o.organizer_id;

SELECT
    e.event_name,
    COUNT(r.registration_id) AS total_registrations
FROM Events e
LEFT JOIN Registrations r ON e.event_id = r.event_id
GROUP BY e.event_id, e.event_name;

SELECT
    s.student_name,
    s.department,
    e.event_name,
    r.registration_date,
    r.status
FROM Students s
JOIN Registrations r ON s.student_id = r.student_id
JOIN Events e ON r.event_id = e.event_id
ORDER BY s.student_name;

SELECT
    s.student_name,
    s.department
FROM Students s
JOIN Registrations r ON s.student_id = r.student_id
JOIN Events e ON r.event_id = e.event_id
WHERE e.event_name = 'Tech Fest';

SELECT e.event_name
FROM Events e
LEFT JOIN Registrations r ON e.event_id = r.event_id
WHERE r.registration_id IS NULL;

SELECT
    c.category_name,
    COUNT(e.event_id) AS total_events
FROM Categories c
LEFT JOIN Events e ON c.category_id = e.category_id
GROUP BY c.category_id, c.category_name;

SELECT
    s.department,
    COUNT(r.registration_id) AS total_registrations
FROM Students s
JOIN Registrations r ON s.student_id = r.student_id
GROUP BY s.department
ORDER BY total_registrations DESC;

SELECT
    e.event_name,
    AVG(f.rating) AS average_rating,
    COUNT(f.feedback_id) AS total_feedback
FROM Events e
LEFT JOIN Feedback f ON e.event_id = f.event_id
GROUP BY e.event_id, e.event_name;

SELECT
    e.event_name,
    COUNT(a.attendance_id) AS attendance_records,
    SUM(CASE WHEN a.attendance_status = 'Present' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN a.attendance_status = 'Absent' THEN 1 ELSE 0 END) AS absent_count
FROM Events e
LEFT JOIN Registrations r ON e.event_id = r.event_id
LEFT JOIN Attendance a ON r.registration_id = a.registration_id
GROUP BY e.event_id, e.event_name;

SELECT *
FROM Events
WHERE event_date >= CURDATE()
ORDER BY event_date;

SELECT
    s.student_name,
    e.event_name,
    f.rating,
    f.comments
FROM Feedback f
JOIN Students s ON f.student_id = s.student_id
JOIN Events e ON f.event_id = e.event_id;

SELECT
    event_name,
    event_date
FROM Events
WHERE event_date BETWEEN '2026-11-01' AND '2026-11-30'
ORDER BY event_date;

SELECT
    student_name,
    department
FROM Students
WHERE department = 'Computer Science';

SELECT
    event_name,
    event_date
FROM Events
WHERE category_id = (
    SELECT category_id
    FROM Categories
    WHERE category_name = 'Technical'
);

SELECT
    event_name,
    venue_id
FROM Events
WHERE venue_id IN (
    SELECT venue_id
    FROM Venues
    WHERE capacity >= 500
);

CREATE VIEW EventDetails AS
SELECT
    e.event_id,
    e.event_name,
    c.category_name,
    v.venue_name,
    o.organizer_name,
    e.event_date,
    e.event_time
FROM Events e
JOIN Categories c ON e.category_id = c.category_id
JOIN Venues v ON e.venue_id = v.venue_id
JOIN Organizers o ON e.organizer_id = o.organizer_id;

SELECT * FROM EventDetails;

CREATE VIEW EventRegistrationCounts AS
SELECT
    e.event_id,
    e.event_name,
    COUNT(r.registration_id) AS total_registrations
FROM Events e
LEFT JOIN Registrations r ON e.event_id = r.event_id
GROUP BY e.event_id, e.event_name;

SELECT * FROM EventRegistrationCounts;

UPDATE Registrations
SET status = 'Cancelled'
WHERE registration_id = 9;

UPDATE Venues
SET capacity = 180
WHERE venue_id = 2;

SELECT
    e.event_name,
    v.venue_name,
    v.capacity
FROM Events e
JOIN Venues v ON e.venue_id = v.venue_id;

SELECT
    e.event_name,
    COUNT(r.registration_id) AS total_registrations
FROM Events e
JOIN Registrations r ON e.event_id = r.event_id
GROUP BY e.event_id, e.event_name
HAVING COUNT(r.registration_id) > 1;

SELECT
    s.student_name,
    COUNT(r.registration_id) AS events_registered
FROM Students s
LEFT JOIN Registrations r ON s.student_id = r.student_id
GROUP BY s.student_id, s.student_name
ORDER BY events_registered DESC;

SELECT
    e.event_name,
    COUNT(a.attendance_id) AS total_attendance_records,
    ROUND(
        100.0 * SUM(
            CASE WHEN a.attendance_status = 'Present' THEN 1 ELSE 0 END
        ) / NULLIF(COUNT(a.attendance_id), 0),
        2
    ) AS attendance_percentage
FROM Events e
LEFT JOIN Registrations r ON e.event_id = r.event_id
LEFT JOIN Attendance a ON r.registration_id = a.registration_id
GROUP BY e.event_id, e.event_name;