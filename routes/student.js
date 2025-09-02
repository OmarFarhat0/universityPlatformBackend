const express = require("express");
const { requireRole } = require("../middleware/auth");
const {
  getEnrolledCourses,
  getCourseLectures,
  getCourseExams,
  submitExamAttempt,
  getExamAttempt,
  getCourseAssignments,
  submitAssignment,
  getAssignmentSubmissions,
} = require("../controllers/studentController");
const upload = require("../middleware/upload");

const router = express.Router();

// Course Management
router.get("/courses", requireRole(["student"]), getEnrolledCourses);
router.get(
  "/courses/:courseId/lectures",
  requireRole(["student"]),
  getCourseLectures
);

// Exam Management
router.get(
  "/courses/:courseId/exams",
  requireRole(["student"]),
  getCourseExams
);

router.post(
  "/exams/:examId/submit",
  requireRole(["student"]),
  submitExamAttempt
);

router.get("/exams/:examId/attempt", requireRole(["student"]), getExamAttempt);

// Assignment Management
router.get(
  "/courses/:courseId/assignments",
  requireRole(["student"]),
  getCourseAssignments
);
router.post(
  "/assignments/:assignmentId/submit",
  requireRole(["student"]),
  upload.single("pdfFile"),
  submitAssignment
);
router.get(
  "/assignments/:assignmentId/submission",
  requireRole(["student"]),
  getAssignmentSubmissions
);

module.exports = router;
