// ------------------------------------------------------------
// MOCK DATA
// This file stands in for the database during the frontend phase.
// Each array below mirrors a table in the eventual database.
// When the backend is ready, this file is no longer imported;
// src/services/api.js will fetch the same shapes from the REST API.
// ------------------------------------------------------------

export const categories = [
  { id: 1, name: 'Technical', description: 'Hackathons, coding contests, workshops' },
  { id: 2, name: 'Cultural', description: 'Music, dance, drama and fine arts' },
  { id: 3, name: 'Sports', description: 'Inter-department and inter-college sports' },
  { id: 4, name: 'Seminar', description: 'Guest lectures and expert talks' },
  { id: 5, name: 'Social', description: 'Community service and awareness drives' },
]

export const venues = [
  { id: 1, name: 'Main Auditorium', building: 'Admin Block', capacity: 800 },
  { id: 2, name: 'Seminar Hall A', building: 'CS Block', capacity: 150 },
  { id: 3, name: 'Open Air Theatre', building: 'Campus Ground', capacity: 1200 },
  { id: 4, name: 'Computer Lab 3', building: 'CS Block', capacity: 60 },
  { id: 5, name: 'Sports Complex', building: 'Sports Wing', capacity: 500 },
  { id: 6, name: 'Conference Room', building: 'Library Block', capacity: 40 },
]

export const organizers = [
  { id: 1, name: 'Dr. Meera Nair', department: 'Computer Science', email: 'meera.nair@college.edu', phone: '98450 11223' },
  { id: 2, name: 'Prof. Arjun Rao', department: 'Cultural Committee', email: 'arjun.rao@college.edu', phone: '98450 44556' },
  { id: 3, name: 'Mr. Kiran Shetty', department: 'Physical Education', email: 'kiran.shetty@college.edu', phone: '98450 77889' },
  { id: 4, name: 'Dr. Sunita Verma', department: 'Electronics', email: 'sunita.verma@college.edu', phone: '98450 99001' },
  { id: 5, name: 'Ms. Priya Menon', department: 'NSS Unit', email: 'priya.menon@college.edu', phone: '98450 22334' },
]

export const students = [
  { id: 1, rollNo: 'CS21001', name: 'Aarav Sharma', email: 'aarav.s@college.edu', department: 'Computer Science', year: 3, phone: '99001 12345' },
  { id: 2, rollNo: 'CS21014', name: 'Diya Patel', email: 'diya.p@college.edu', department: 'Computer Science', year: 3, phone: '99001 23456' },
  { id: 3, rollNo: 'EC22007', name: 'Rohan Iyer', email: 'rohan.i@college.edu', department: 'Electronics', year: 2, phone: '99001 34567' },
  { id: 4, rollNo: 'ME20022', name: 'Sneha Reddy', email: 'sneha.r@college.edu', department: 'Mechanical', year: 4, phone: '99001 45678' },
  { id: 5, rollNo: 'CS23031', name: 'Vikram Singh', email: 'vikram.s@college.edu', department: 'Computer Science', year: 1, phone: '99001 56789' },
  { id: 6, rollNo: 'CV21009', name: 'Ananya Das', email: 'ananya.d@college.edu', department: 'Civil', year: 3, phone: '99001 67890' },
  { id: 7, rollNo: 'EC21018', name: 'Karthik Menon', email: 'karthik.m@college.edu', department: 'Electronics', year: 3, phone: '99001 78901' },
  { id: 8, rollNo: 'CS22045', name: 'Ishita Gupta', email: 'ishita.g@college.edu', department: 'Computer Science', year: 2, phone: '99001 89012' },
  { id: 9, rollNo: 'ME22011', name: 'Aditya Kumar', email: 'aditya.k@college.edu', department: 'Mechanical', year: 2, phone: '99001 90123' },
  { id: 10, rollNo: 'CV23004', name: 'Neha Joshi', email: 'neha.j@college.edu', department: 'Civil', year: 1, phone: '99001 01234' },
]

export const events = [
  { id: 1, title: 'HackNova 2026', categoryId: 1, venueId: 4, organizerId: 1, date: '2026-11-08', startTime: '09:00', endTime: '21:00', maxParticipants: 60, status: 'Upcoming', description: '12-hour hackathon on AI for social good.' },
  { id: 2, title: 'Rhythm Night', categoryId: 2, venueId: 3, organizerId: 2, date: '2026-11-15', startTime: '18:00', endTime: '22:00', maxParticipants: 1000, status: 'Upcoming', description: 'Annual inter-college music and dance fest.' },
  { id: 3, title: 'Inter-Dept Cricket Cup', categoryId: 3, venueId: 5, organizerId: 3, date: '2026-10-20', startTime: '08:00', endTime: '17:00', maxParticipants: 120, status: 'Completed', description: 'Knock-out cricket tournament between departments.' },
  { id: 4, title: 'Guest Talk: Future of VLSI', categoryId: 4, venueId: 2, organizerId: 4, date: '2026-10-25', startTime: '11:00', endTime: '13:00', maxParticipants: 150, status: 'Ongoing', description: 'Industry expert session on chip design careers.' },
  { id: 5, title: 'Blood Donation Camp', categoryId: 5, venueId: 1, organizerId: 5, date: '2026-10-12', startTime: '09:00', endTime: '15:00', maxParticipants: 300, status: 'Completed', description: 'In association with Red Cross Society.' },
  { id: 6, title: 'Web Dev Bootcamp', categoryId: 1, venueId: 4, organizerId: 1, date: '2026-12-02', startTime: '10:00', endTime: '16:00', maxParticipants: 50, status: 'Upcoming', description: 'Hands-on React and Node.js workshop.' },
  { id: 7, title: 'Drama Fest: Rangmanch', categoryId: 2, venueId: 1, organizerId: 2, date: '2026-09-28', startTime: '17:00', endTime: '20:00', maxParticipants: 600, status: 'Completed', description: 'Street play and stage drama competition.' },
  { id: 8, title: 'Tree Plantation Drive', categoryId: 5, venueId: 3, organizerId: 5, date: '2026-11-22', startTime: '07:00', endTime: '10:00', maxParticipants: 200, status: 'Cancelled', description: 'Postponed due to weather forecast.' },
]

export const registrations = [
  { id: 1, studentId: 1, eventId: 1, registeredOn: '2026-10-14', status: 'Confirmed' },
  { id: 2, studentId: 2, eventId: 1, registeredOn: '2026-10-14', status: 'Confirmed' },
  { id: 3, studentId: 5, eventId: 1, registeredOn: '2026-10-16', status: 'Waitlisted' },
  { id: 4, studentId: 3, eventId: 4, registeredOn: '2026-10-18', status: 'Confirmed' },
  { id: 5, studentId: 7, eventId: 4, registeredOn: '2026-10-18', status: 'Confirmed' },
  { id: 6, studentId: 4, eventId: 3, registeredOn: '2026-10-05', status: 'Confirmed' },
  { id: 7, studentId: 9, eventId: 3, registeredOn: '2026-10-06', status: 'Confirmed' },
  { id: 8, studentId: 6, eventId: 5, registeredOn: '2026-10-01', status: 'Confirmed' },
  { id: 9, studentId: 10, eventId: 5, registeredOn: '2026-10-02', status: 'Confirmed' },
  { id: 10, studentId: 8, eventId: 2, registeredOn: '2026-10-20', status: 'Confirmed' },
  { id: 11, studentId: 1, eventId: 2, registeredOn: '2026-10-21', status: 'Cancelled' },
  { id: 12, studentId: 2, eventId: 7, registeredOn: '2026-09-15', status: 'Confirmed' },
  { id: 13, studentId: 8, eventId: 6, registeredOn: '2026-10-22', status: 'Confirmed' },
]

export const attendance = [
  { id: 1, studentId: 4, eventId: 3, status: 'Present', checkInTime: '08:05' },
  { id: 2, studentId: 9, eventId: 3, status: 'Present', checkInTime: '08:12' },
  { id: 3, studentId: 6, eventId: 5, status: 'Present', checkInTime: '09:20' },
  { id: 4, studentId: 10, eventId: 5, status: 'Absent', checkInTime: '' },
  { id: 5, studentId: 2, eventId: 7, status: 'Present', checkInTime: '17:02' },
  { id: 6, studentId: 3, eventId: 4, status: 'Present', checkInTime: '10:55' },
  { id: 7, studentId: 7, eventId: 4, status: 'Absent', checkInTime: '' },
]

export const feedback = [
  { id: 1, studentId: 4, eventId: 3, rating: 5, comments: 'Well organised, great umpiring and refreshments.', submittedOn: '2026-10-21' },
  { id: 2, studentId: 9, eventId: 3, rating: 4, comments: 'Matches ran a bit late but overall fun.', submittedOn: '2026-10-21' },
  { id: 3, studentId: 6, eventId: 5, rating: 5, comments: 'Smooth process, volunteers were very helpful.', submittedOn: '2026-10-13' },
  { id: 4, studentId: 2, eventId: 7, rating: 3, comments: 'Sound system issues in the second half.', submittedOn: '2026-09-29' },
  { id: 5, studentId: 3, eventId: 4, rating: 4, comments: 'Very informative talk, wanted a longer Q&A.', submittedOn: '2026-10-25' },
]
